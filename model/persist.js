const _ = require('lodash');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const crypto = require('crypto');
const uuid = require('uuid/v4');
const Hangul = require('hangul-js');
const Parser = require('koto-parser');

const messages = require('../static/messages.json');

function notBlank(text) {
	return (_.isString(text) && text.trim() !== '');
}

function shasum(value) {
	const hasher = crypto.createHash('sha1');
	hasher.update(value);
	return hasher.digest('hex');
}

function sanitize(data, include, exclude) {
	const result = {};

	Object.keys(data).forEach(function(key) {
		const included = () => (include.indexOf(key) >= 0);
		const excluded = () => (exclude.indexOf(key) >= 0);

		if ((include && included()) || (exclude && !excluded())) {
			result[key] = data[key];
		}
	});

	return result;
}

function isCompleteChar(char) {
	if (char.match(/[ㄱ-ㅎㅏ-ㅣ가-힣]/)) {
		if (Hangul.endsWithConsonant(char)) {
			const lastSound = _.last(Hangul.disassemble(lastChar));
			return (['ㄱ', 'ㄴ', 'ㄹ', 'ㅂ'].indexOf(lastSound) >= 0);
		} else {
			return true;
		}
	} else {
		return false;
	}
}

class PersistModel {
	constructor(persistConfig) {
		if (_.isArray(persistConfig)) {
			persistConfig.unshift(null);
			this.client = new (Function.prototype.bind.apply(Sequelize, persistConfig));
		} else {
			this.client = new Sequelize(persistConfig);
		}

		this.User = this.client.define('User', {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
				validate: {
					is: {
						args: /^[a-zA-Z0-9_]{4,20}$/,
						msg: messages.user_id_invalid
					},
					notIn: {
						args: [['me']],
						msg: messages.user_id_exist
					}
				}
			},
			password: {
				type: Sequelize.STRING,
				validate: {
					notEmpty: { msg: messages.password_required }
				},
				set: function(value) {
					if (notBlank(value)) {
						value = shasum(value);
					} else {
						value = '';
					}

					this.setDataValue('password', value);
				}
			},
			name: {
				type: Sequelize.STRING,
				validate: {
					notEmpty: { msg: messages.user_name_required }
				},
				set: function(value) {
					this.setDataValue('name', notBlank(value) ? value : '');
				}
			}
		});

		this.Document = this.client.define('Document', {
			historyId: {
				type: Sequelize.STRING,
				allowNull: false,
				defaultValue: uuid
			},
			isArchived: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false
			},
			title: {
				type: Sequelize.STRING,
				validate: {
					notEmpty: { msg: messages.title_required }
				},
				set: function(value) {
					this.setDataValue('title', notBlank(value) ? value : '');
				}
			},
			content: {
				type: Sequelize.TEXT,
				validate: {
					notEmpty: { msg: messages.content_required }
				},
				set: function(value) {
					this.setDataValue('content', notBlank(value) ? value : '');
				}
			},
			parsedContent: {
				type: Sequelize.TEXT,
				validate: {
					notEmpty: { msg: messages.content_required }
				},
				set: function(value) {
					this.setDataValue('parsedContent', notBlank(value) ? value : '');
				}
			}
		}, {
			indexes: [
				{
					fields: ['historyId']
				}
			]
		});

		this.Tag = this.client.define('Tag', {
			title: {
				type: Sequelize.STRING,
				unique: true,
				validate: {
					notEmpty: { msg: messages.title_required }
				},
				set: function(value) {
					this.setDataValue('title', notBlank(value) ? value : '');
				}
			},
			count: {
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 1
			},
			color: {
				type: Sequelize.STRING,
				validate: {
					is: {
						args: /^#[0-9a-fA-F]{6}$/,
						msg: messages.color_invalid
					}
				},
				set: function(value) {
					this.setDataValue('color', notBlank(value) ? value : '');
				}
			}
		});

		this.Comment = this.client.define('Comment', {
			content: {
				type: Sequelize.TEXT,
				validate: {
					notEmpty: { msg: messages.content_required }
				},
				set: function(value) {
					this.setDataValue('content', notBlank(value) ? value : '');
				}
			},
			range: {
				type: Sequelize.STRING,
				validate: {
					is: {
						args: /^{(\s*("start"|"end"|'start'|'end'|start|end)\s*:\s*\d+\s*,?\s*)+}$/
					}
				},
				set: function(value) {
					if (_.isObjectLike(value)) {
						value = JSON.stringify(value);
					} else {
						value = '';
					}

					this.setDataValue('range', value);
				}
			}
		});

		this.Document.belongsTo(this.User, { as: 'author' });
		this.Comment.belongsTo(this.User, { as: 'author' });

		this.Document.belongsToMany(this.Tag, {
			through: 'DocumentToTag',
			foreignKey: 'documentId',
			otherKey: 'tagId'
		});

		this.Document.hasMany(this.Comment, { foreignKey: 'documentId' });

		this.User.Instance.prototype.finalize = function(trx) {
			const result = sanitize(this.toJSON(), null, ['password']);
			return Promise.resolve(result);
		};

		this.Document.Instance.prototype.finalize = function(trx) {
			const result = this.toJSON();

			return Promise.all([
				Promise.map(['author', 'tags', 'comments'], (key) => {
					return this['get' + _.capitalize(key)]({
						transaction: trx
					}).then(function(value) {
						if (_.isArray(value)) {
							return Promise.map(value, function(instance) {
								return instance.finalize(trx);
							});
						} else {
							return value.finalize(trx);
						}
					}).then(function(value) {
						result[key] = value;
					});
				}),
			]).thenReturn(result);
		};

		this.Tag.Instance.prototype.finalize = function(trx) {
			const result = sanitize(this.toJSON(), null, ['DocumentToTag']);
			return Promise.resolve(result);
		};

		this.Comment.Instance.prototype.finalize = function(trx) {
			const result = this.toJSON();

			result.range = JSON.parse(result.range);

			return this.getAuthor({ transaction: trx }).then(function(author) {
				return author.finalize(trx).then(function(author) {
					result.author = sanitize(author, null, ['password']);
				});
			}).thenReturn(result);
		};
	}

	sync(force) {
		return this.client.sync({ force: force });
	}

	getUser(id, trx) {
		return this.User
			.findById(id, { transaction: trx })
			.then(function(user) {
				if (!user) {
					throw new Error(messages.user_not_exist);
				}

				return user;
			});
	}

	authUser(id, password, trx) {
		return this.User
			.findOne({
				where: {
					id: id,
					password: shasum(password)
				},
				transaction: trx
			})
			.then(function(user) {
				if (!user) {
					throw new Error(messages.login_failed);
				}

				return user;
			});
	}

	addUser(user, trx) {
		return this.User
			.create(sanitize(user, ['id', 'password', 'name']), {
				transaction: trx
			})
			.catch(Sequelize.UniqueConstraintError, function(error) {
				error.message = messages.id_exist;
				throw error;
			});
	}

	updateUser(id, user, trx) {
		return this.User
			.update(sanitize(user, null, ['id']), {
				where: { id: id },
				transaction: trx
			})
			.spread((count) => {
				if (count === 0) {
					throw new Error(messages.user_not_exist);
				}

				return this.getUser(id, trx);
			});
	}

	removeUser(id, trx) {
		return this.User
			.findById(id, { transaction: trx })
			.then(function(user) {
				if (!user) {
					throw new Error(messages.user_not_exist);
				}

				return user
					.destroy({ transaction: trx })
					.thenReturn(user);
			});
	}

	getDocument(id, trx) {
		return this.Document
			.findById(id, { transaction: trx })
			.then((document) => {
				if (!document) {
					throw new Error(messages.document_not_exist);
				}

				return document;
			});
	}

	searchDocument(type, query, pagination, trx) {
		let search;

		switch (type) {
			case 'history':
				search = this.searchDocumentByHistoryId;
				break;

			case 'tag':
				search = this.searchDocumentByTagId;
				break;

			case 'text':
				search = this.searchDocumentByText;
				break;

			default:
				search = this.searchDocumentByDate;
		}
		
		return search.call(this, query, pagination, trx);
	}

	searchDocumentByDate(__, pagination, trx) {
		return this.Document
			.findAll({
				where: { id: { $gt: pagination[0]} },
				order: [['updatedAt', 'DESC']],
				limit: pagination[1],
				transaction: trx
			});
	}

	searchDocumentByHistoryId(historyId, pagination, trx) {
		return this.Document
			.findAll({
				where: {
					id: { $gt: pagination[0] },
					historyId: historyId
				},
				order: [['updatedAt', 'DESC']],
				limit: pagination[1],
				transaction: trx
			})
			.then(function(documents) {
				if (documents.length === 0) {
					throw new Error(messages.document_not_exist);
				}

				return documents;
			});
	}

	searchDocumentByTagId(tagId, pagination, trx) {
		return this.Document
			.findAll({
				where: {
					id: { $gt: pagination[0] }
				},
				include: [{
					model: this.Tag,
					attributes: [],
					where: {
						id: tagId
					}
				}],
				limit: pagination[1],
				order: [['updatedAt', 'DESC']],
				transaction: trx
			})
			.then(function(documents) {
				if (documents.length === 0) {
					throw new Error(messages.tag_not_exist);
				}

				return documents;
			});
	}

	searchDocumentByText(text, pagination, trx) {
		return this.Document
			.findAll({
				where: {
					$or: [
						{ title: { $like: `%${text}%` } },
						{ content: { $like: `%${text}%` } },
					],
					id: { $gt: pagination[0] }
				},
				order: [['updatedAt', 'DESC']],
				limit: pagination[1],
				transaction: trx
			});
	}

	addDocument(document, trx) {
		return new Promise(function(resolve, reject) {
			Parser.render(document.content, function(error, parsedContent) {
				if (error) {
					reject(error);
				} else {
					resolve(parsedContent);
				}
			});
		})
		.then((parsedContent) => {
			document.parsedContent = parsedContent;

			return this.Document
				.create(sanitize(document, ['historyId', 'title', 'content', 'parsedContent']), {
					transaction: trx
				})
				.then((createdDocument) => {
					return Promise.all([
						createdDocument.setAuthor(document.authorId, { transaction: trx }),

						Promise.map(document.tags, (tag) => {
							return this.increaseOrAddTag(tag, trx);
						}).then(function(tags) {
							return createdDocument.setTags(tags, { transaction: trx });
						})
					])
					.thenReturn(createdDocument);
				});
		});
	}

	updateDocument(id, document, trx) {
		return this.Document
			.findOne({
				where: {
					id: id,
					isArchived: false
				},
				transaction: trx
			})
			.then((foundDocument) => {
				if (!foundDocument) {
					throw new Error(messages.document_not_exist);
				}

				return this.archiveDocumentInstance(foundDocument, trx);
			})
			.then((foundDocument) => {
				document.historyId = foundDocument.historyId;
				return this.addDocument(document, trx);
			});
	}

	archiveDocument(id, trx) {
		return this.Document
			.findOne({
				where: {
					id: id,
					isArchived: false
				},
				transaction: trx
			})
			.then((foundDocument) => {
				if (!foundDocument) {
					throw new Error(messages.document_not_exist);
				}

				return this.archiveDocumentInstance(foundDocument, trx);
			});
	}

	archiveDocumentInstance(document, trx) {
		return document
			.update({ isArchived: true }, { transaction: trx })
			.then(() => {
				return document.getTags({ transaction: trx }).map((tag) => {
					return this.decreaseOrRemoveTag(tag.id, trx);
				});
			})
			.thenReturn(document);
	}

	getTag(id, trx) {
		return this.Tag
			.findById(id, { transaction: trx })
			.then(function(tag) {
				if (!tag) {
					throw new Error(messages.tag_not_exist);
				}

				return tag;
			});
	}

	searchTag(query, pagination, trx) {
		if (!query) {
			return this.Tag.findAll();
		}

		let lastChar = query.substr(query.length - 1, 1);

		if (isCompleteChar(lastChar)) {
			query = query.substr(0, query.length - 1);
		} else {
			lastChar = null;
		}

		return this.Tag
			.findAll({
				where: {
					title: { $like: `%${query}%` },
					id: { $gt: pagination[0] }
				},
				order: [['title', 'ASC']],
				limit: pagination[1],
				transaction: trx
			})
			.filter(function(tag) {
				if (lastChar === null) {
					return true;
				}
				
				const queryIndex = tag.title.indexOf(query);
				const charAfterQuery = tag.title.substr(queryIndex + 1, 1);
				
				if (charAfterQuery) {
					return Hangul.search(charAfterQuery, lastChar);
				} else {
					return false;
				}
			});
	}

	updateTag(id, tag, trx) {
		return this.Tag
			.update(sanitize(tag, ['title', 'color']), {
				where: { id: id },
				transaction: trx
			})
			.spread((count) => {
				if (count === 0) {
					throw new Error(messages.tag_not_exist);
				}

				return this.getTag(id, trx);
			});
	}

	removeTag(id, trx) {
		return this.Tag
			.findById(id, { transaction: trx })
			.then(function(tag) {
				if (!tag) {
					throw new Error(messages.tag_not_exist);
				}

				return tag
					.destroy({ transaction: trx })
					.thenReturn(tag);
			});
	}

	increaseOrAddTag(tag, trx) {
		return this.Tag.findOne({
			where: { title: tag.title },
			transaction: trx
		})
		.then((foundTag) => {
			if (foundTag) {
				return foundTag.update({
					count: foundTag.count + 1,
					color: tag.color
				}, {
					transaction: trx
				});
			} else {
				return this.Tag.create({
					title: tag.title,
					color: tag.color
				}, {
					transaction: trx
				});
			}
		});
	}

	decreaseOrRemoveTag(id, trx) {
		return this.Tag
			.findById(id, { transaction: trx })
			.then(function(tag) {
				if (!tag) {
					throw new Error(messages.tag_not_exist);
				}

				if (tag.count === 1) {
					return tag.destroy({ transaction: trx }).thenReturn(tag);
				}

				return tag.update({ count: tag.count - 1 }, { transaction: trx });
			});
	}

	getComment(id, trx) {
		return this.Comment
			.findById(id, { transaction: trx })
			.then(function(comment) {
				if (!comment) {
					throw new Error(messages.comment_not_exist);
				}

				return comment;
			})
	}

	addComment(documentId, comment, trx) {
		return this.Document
			.findById(documentId, { transaction: trx })
			.then(function(document) {
				if (!document) {
					throw new Error(messages.document_not_exist);
				}

				return document
					.createComment(sanitize(comment, ['content', 'range']), {
						transaction: trx
					});
			})
			.then(function(addedComment) {
				return addedComment
					.setAuthor(comment.authorId, { transaction: trx })
					.thenReturn(addedComment);
			})
	}

	updateComment(id, comment, trx) {
		return this.Comment
			.update(sanitize(comment, ['content', 'range']), {
				where: { id: id },
				transaction: trx
			})
			.spread((count) => {
				if (count === 0) {
					throw new Error(messages.comment_not_exist);
				}

				return this.getComment(id, trx);
			});
	}

	removeComment(id, trx) {
		return this.Comment
			.findById(id, { transaction: trx })
			.then(function(comment) {
				if (!comment) {
					throw new Error(messages.comment_not_exist);
				}

				return comment
					.destroy({ transaction: trx })
					.thenReturn(comment);
			});
	}
}

module.exports = PersistModel;