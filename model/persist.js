const _ = require('lodash');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const crypto = require('crypto');
const uuid = require('uuid/v4');
const Hangul = require('hangul-js');

const Parser = require('../util/parser');

const messages = require('../static/messages.json');
const {HttpError} = require('../server/error');

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

function populateAttrs(instance, attrKeys, trx) {
	const result = instance.toJSON();

	return Promise.map(attrKeys, function(attrKey) {
		return instance['get' + _.capitalize(attrKey)]({
			transaction: trx
		}).then(function(attrValue) {
			if (_.isArray(attrValue)) {
				return Promise.map(attrValue, function(item) {
					return item.finalize(trx);
				});
			} else {
				return attrValue.finalize(trx);
			}
		}).then(function(attr) {
			result[attrKey] = attr;
		});
	}).thenReturn(result);
}

function isCompleteChar(char) {
	if (char.match(/[ㄱ-ㅎㅏ-ㅣ가-힣]/)) {
		if (Hangul.endsWithConsonant(char)) {
			const lastSound = _.last(Hangul.disassemble(char));
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
						args: [['me' ,'search']],
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
			revision: {
				type:Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 1
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
			indexes: [{
				fields: ['historyId']
			}]
		});

		this.File = this.client.define('File', {
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
			revision: {
				type:Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 1
			},
			filename: {
				type: Sequelize.STRING,
				allowNull: false
			},
			content: {
				type: Sequelize.TEXT
			},
			parsedContent: {
				type: Sequelize.TEXT
			}
		}, {
			indexes: [{
				fields: ['historyId']
			}]
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
					}

					this.setDataValue('range', value);
				}
			}
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

		this.Document.belongsTo(this.User, { as: 'author' });
		this.Document.belongsToMany(this.Tag, {
			through: 'DocumentToTag',
			foreignKey: 'documentId',
			otherKey: 'tagId'
		});
		this.Document.hasMany(this.Comment, { foreignKey: 'documentId' });

		this.File.belongsTo(this.User, { as: 'author' });
		this.File.belongsToMany(this.Tag, {
			through: 'FileToTag',
			foreignKey: 'fileId',
			otherKey: 'tagId'
		});
		this.File.hasMany(this.Comment, { foreignKey: 'fileId' });

		this.Comment.belongsTo(this.User, { as: 'author' });

		this.User.Instance.prototype.finalize = function(trx) {
			return Promise.resolve(sanitize(this.toJSON(), null, ['password']));
		};

		this.Document.Instance.prototype.finalize = function(trx) {
			return populateAttrs(this, ['author', 'tags', 'comments'], trx);
		};

		this.File.Instance.prototype.finalize = function(trx) {
			return populateAttrs(this, ['author', 'tags', 'comments'], trx);
		};

		this.Tag.Instance.prototype.finalize = function(trx) {
			return Promise.resolve(sanitize(this.toJSON(), null, ['TagLookup']));
		};

		this.Comment.Instance.prototype.finalize = function(trx) {
			return populateAttrs(this, ['author'], trx);
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
					throw new HttpError('user_not_exist', 404);					
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
					throw new HttpError('login_failed', 401);
				}

				return user;
			});
	}

	searchUser(query, pagination, trx) {
		let lastChar = query.substr(query.length - 1, 1);

		if (isCompleteChar(lastChar)) {
			query = query.substr(0, query.length - 1);
		} else {
			lastChar = null;
		}

		return this.User
			.findAll({
				where: {
					$or: {
						id: {
							$like: `%${query}%`,
							$gt: pagination[0]
						},
						name: { $like: `%${query}%` }
					}
				},
				order: [['id', 'ASC']],
				limit: pagination[1],
				transaction: trx
			})
			.filter(function(user) {
				if (lastChar === null) {
					return true;
				}

				return [user.id, user.name].find(function(item) {
					const queryIndex = item.indexOf(queryIndex);

					if (queryIndex < 0) {
						return false;
					}

					const charAfterQuery = user.id.substr(queryIndex + 1, 1);

					if (charAfterQuery) {
						return Hangul.search(charAfterQuery, lastChar);
					} else {
						return false;
					}
				});
			});
	}

	addUser(user, trx) {
		return this.User
			.create(sanitize(user, ['id', 'password', 'name']), {
				transaction: trx
			})
			.catch(function(error) {
				if (error.name === 'SequelizeUniqueConstraintError') {
					error.message = messages.user_id_exist;
				}

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
					throw new HttpError('user_not_exist', 404);
				}

				return this.getUser(id, trx);
			});
	}

	removeUser(id, trx) {
		return this.User
			.findById(id, { transaction: trx })
			.then(function(user) {
				if (!user) {
					throw new HttpError('user_not_exist', 404);
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
					throw new HttpError('document_not_exist', 404);
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
					throw new HttpError('document_not_exist', 404);
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
					throw new HttpError('tag_not_exist', 404);
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
		return Parser.renderPromise(document.content, this).then((parsedContent) => {
			document.parsedContent = parsedContent;

			return this.Document
				.create(sanitize(document, [
					'historyId',
					'revision',
					'title',
					'content',
					'parsedContent'
				]), {
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
				where: { id: id },
				transaction: trx
			})
			.then((foundDocument) => {
				if (!foundDocument) {
					throw new HttpError('document_not_exist', 404);
				}

				if (foundDocument.isArchived) {
					throw new HttpError('document_already_updated', 409);
				}

				return this.archiveDocumentInstance(foundDocument, trx);
			})
			.then((foundDocument) => {
				document.historyId = foundDocument.historyId;
				document.revision = foundDocument.revision + 1;

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
					throw new HttpError('document_not_exist', 404);
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

	getFile(id, trx) {
		return this.File
			.findById(id, { transaction: trx })
			.then((file) => {
				if (!file) {
					throw new HttpError('file_not_exist', 404);
				}

				return file;
			});
	}

	searchFile(type, query, pagination, trx) {
		let search;

		switch (type) {
		case 'history':
			search = this.searchFileByHistoryId;
			break;

		case 'tag':
			search = this.searchFileByTagId;
			break;

		case 'text':
			search = this.searchFileByText;
			break;

		default:
			search = this.searchFileByDate;
		}

		return search.call(this, query, pagination, trx);
	}

	searchFileByDate(__, pagination, trx) {
		return this.File
			.findAll({
				where: { id: { $gt: pagination[0]} },
				order: [['updatedAt', 'DESC']],
				limit: pagination[1],
				transaction: trx
			});
	}

	searchFileByHistoryId(historyId, pagination, trx) {
		return this.File
			.findAll({
				where: {
					id: { $gt: pagination[0] },
					historyId: historyId
				},
				order: [['updatedAt', 'DESC']],
				limit: pagination[1],
				transaction: trx
			})
			.then(function(files) {
				if (files.length === 0) {
					throw new HttpError('file_not_exist', 404);
				}

				return files;
			});
	}

	searchFileByTagId(tagId, pagination, trx) {
		return this.File
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
			.then(function(files) {
				if (files.length === 0) {
					throw new HttpError('tag_not_exist', 404);
				}

				return files;
			});
	}

	searchFileByText(text, pagination, trx) {
		return this.File
			.findAll({
				where: {
					$or: [
						{ filename: { $like: `%${text}%` } },
						{ content: { $like: `%${text}%` } },
					],
					id: { $gt: pagination[0] }
				},
				order: [['updatedAt', 'DESC']],
				limit: pagination[1],
				transaction: trx
			});
	}

	addFile(file, trx) {
		return Parser.renderPromise(file.content, this).then((parsedContent) => {
			file.parsedContent = parsedContent;

			return this.File
				.create(sanitize(file, [
					'historyId',
					'revision',
					'filename',
					'content',
					'parsedContent'
				]), {
					transaction: trx
				})
				.then((createdFile) => {
					return Promise.all([
						createdFile.setAuthor(file.authorId, { transaction: trx }),

						Promise.map(file.tags, (tag) => {
							return this.increaseOrAddTag(tag, trx);
						}).then(function(tags) {
							return createdFile.setTags(tags, { transaction: trx });
						})
					])
					.thenReturn(createdFile);
				});
		});
	}

	updateFile(id, file, trx) {
		return this.File
			.findOne({
				where: { id: id },
				transaction: trx
			})
			.then((foundFile) => {
				if (!foundFile) {
					throw new HttpError('file_not_exist', 404);
				}

				if (foundFile.isArchived) {
					throw new HttpError('file_already_updated', 409);
				}

				return this.archiveFileInstance(foundFile, trx);
			})
			.then((foundFile) => {
				file.historyId = foundFile.historyId;
				file.revision = foundFile.revision + 1;

				return this.addFile(file, trx);
			});
	}

	archiveFile(id, trx) {
		return this.File
			.findOne({
				where: {
					id: id,
					isArchived: false
				},
				transaction: trx
			})
			.then((foundFile) => {
				if (!foundFile) {
					throw new HttpError('file_not_exist', 404);
				}

				return this.archiveFileInstance(foundFile, trx);
			});
	}

	archiveFileInstance(file, trx) {
		return file
			.update({ isArchived: true }, { transaction: trx })
			.then(() => {
				return file.getTags({ transaction: trx }).map((tag) => {
					return this.decreaseOrRemoveTag(tag.id, trx);
				});
			})
			.thenReturn(file);
	}

	getTag(id, trx) {
		return this.Tag
			.findById(id, { transaction: trx })
			.then(function(tag) {
				if (!tag) {
					throw new HttpError('tag_not_exist', 404);
				}

				return tag;
			});
	}

	searchTag(query, pagination, trx) {
		let lastChar = query.substr(query.length - 1, 1);

		if (isCompleteChar(lastChar)) {
			query = query.substr(0, query.length - 1);
		} else {
			lastChar = null;
		}

		return this.Tag
			.findAll({
				where: {
					id: { $gt: pagination[0] },
					title: { $like: `%${query}%` }
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
					throw new HttpError('tag_not_exist', 404);
				}

				return this.getTag(id, trx);
			});
	}

	removeTag(id, trx) {
		return this.Tag
			.findById(id, { transaction: trx })
			.then(function(tag) {
				if (!tag) {
					throw new HttpError('tag_not_exist', 404);
				}

				return tag
					.destroy({ transaction: trx })
					.thenReturn(tag);
			});
	}

	increaseOrAddTag(tag, trx) {
		return this.Tag
			.findOne({
				where: { title: tag.title },
				transaction: trx
			})
			.then((foundTag) => {
				if (foundTag) {
					return this.updateTag(foundTag.id, {
						count: foundTag.count + 1,
						color: tag.color
					}, trx);
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
					throw new HttpError('tag_not_exist', 404);
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
					throw new HttpError('comment_not_exist', 404);
				}

				return comment;
			});
	}

	addComment(documentId, comment, trx) {
		return this.Document
			.findOne({
				where: {
					id: documentId,
					isArchived: false
				},
				transaction: trx
			})
			.then(function(document) {
				if (!document) {
					throw new HttpError('document_not_exist', 404);
				}

				return document.createComment(sanitize(comment, ['content', 'range']), {
					transaction: trx
				});
			})
			.then(function(addedComment) {
				return addedComment
					.setAuthor(comment.authorId, { transaction: trx })
					.thenReturn(addedComment);
			});
	}

	updateComment(id, comment, trx) {
		return this.Comment
			.update(sanitize(comment, ['content', 'range']), {
				where: { id: id },
				include: [{
					model: this.Document,
					attributes: [],
					where: { isArchived: false }
				}],
				transaction: trx
			})
			.spread((count) => {
				if (count === 0) {
					throw new HttpError('comment_not_exist', 404);
				}

				return this.getComment(id, trx);
			});
	}

	removeComment(id, trx) {
		return this.Comment
			.findOne({
				where: {
					id: id
				},
				include: [{
					model: this.Document,
					attributes: [],
					where: { isArchived: false }
				}],
				transaction: trx
			})
			.then(function(comment) {
				if (!comment) {
					throw new HttpError('comment_not_exist', 404);
				}

				return comment
					.destroy({ transaction: trx })
					.thenReturn(comment);
			});
	}
}

module.exports = PersistModel;