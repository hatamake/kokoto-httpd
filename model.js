const crypto = require('crypto');
const async = require('async');
const marked = require('marked');

const messages = require('./messages.json');

function shasum(input) {
	var hasher = crypto.createHash('sha1');
	hasher.update(input);
	return hasher.digest('hex');
}

function extractError(error) {
	if ("errors" in error) {
		const firstErrorKey = Object.keys(error.errors)[0];
		return error.errors[firstErrorKey];
	} else {
		return error;
	}
}

function checkUserPassword(password, callback) {
	if (!password || password.trim().length == 0) {
		callback(new Error(messages.password_required), null);
	} else {
		callback(null, shasum(password));
	}
}

function sanitizeUser(user) {
	const result = {};

	['_id', 'username'].forEach(function(key) {
		result[key] = user[key];
	});

	return result;
}

class Model {
	constructor(config, mongoose) {
		this.pagination = config.pagination;

		const Schema = mongoose.Schema;
		const ObjectId = Schema.ObjectId;

		this.User = mongoose.model('User', new Schema({
			username: {
				type: String,
				unique: [true, messages.username_exist],
				required: [true, messages.username_required],
				match: [/^[a-zA-Z0-9_]{4,20}$/, messages.username_invalid]
			},
			password: {
				type: String,
				required: true
			}
		}));

		this.Document = mongoose.model('Document', new Schema({
			index: {
				type: ObjectId,
				ref: 'DocumentIndex',
				required: true
			},
			latest: {
				type: Boolean,
				required: true,
				default: true
			},
			author: {
				type: ObjectId,
				ref: 'User',
				required: true
			},
			title: {
				type: String,
				required: [true, messages.title_required]
			},
			markdown: {
				type: String,
				required: [true, messages.content_required]
			},
			html: {
				type: String
			},
			comments: {
				type: [{ type: ObjectId, ref: 'Comment' }],
				default: []
			},
			tags: {
				type: [{ type: ObjectId, ref: 'Tag' }],
				default: []
			}
		}, {
			timestamps: true
		}));

		this.DocumentIndex = mongoose.model('DocumentIndex', new Schema({
			items: {
				type: [{ type: ObjectId, ref: 'Document' }],
				default: []
			}
		}));

		this.Tag = mongoose.model('Tag', new Schema({
			title: {
				type: String,
				require: [true, messages.title_required]
			},
			count: {
				type: Number,
				required: true,
				default: 0
			},
			color: {
				type: String,
				required: true,
				default: '#333333',
				match: [/^#[0-9a-fA-F]{6}$/, messages.color_invalid]
			}
		}));

		this.Comment = mongoose.model('Comment', new Schema({
			author: {
				type: ObjectId,
				ref: 'User',
				required: true
			},
			content: {
				type: String,
				required: [true, messages.content_required]
			},
			range: {
				type: new Schema({
					start: {
						type: Number,
						required: true
					},
					end: {
						type: Number,
						required: true
					}
				}, {
					_id : false
				}),
				required: true
			}
		}, {
			timestamps: true
		}));
	}

	getUser(id, sanitize, callback) {
		if (callback === undefined) {
			callback = sanitize;
			sanitize = false;
		}

		this.User.findOne({ _id: id }, function(error, user) {
			if (error) {
				callback(error, null);
			} else {
				if (sanitize) {
					user = sanitizeUser(user);
				}

				callback(null, user);
			}
		});
	}

	authUser(username, password, callback) {
		async.waterfall([
			(callback) => {
				checkUserPassword(password, callback);
			},
			(hashedPassword, callback) => {
				this.User.findOne({
					username: username,
					password: hashedPassword
				}, callback);
			},
			(user, callback) => {
				if (!user) {
					callback(new Error(messages.login_failed), null);
				} else {
					callback(null, sanitizeUser(user));
				}
			}
		], callback);
	}

	addUser(user, callback) {
		async.waterfall([
			(callback) => {
				checkUserPassword(user.password, callback);
			},
			(password, callback) => {
				user.password = password;

				this.User.create(user, function (error, addedUser) {
					if (error) {
						callback(extractError(error), null);
					} else {
						callback(null, sanitizeUser(addedUser));
					}
				});
			}
		], callback);
	}

	updateUser(id, user, callback) {
		async.waterfall([
			(callback) => {
				if (user.password) {
					checkUserPassword(user.password, callback);
				} else {
					callback(null, null);
				}
			},
			(password, callback) => {
				if (password !== null) {
					user.password = password;
				}

				this.User.findOneAndUpdate({
					_id: id
				}, user, {
					runValidators: true
				}, function (error) {
					callback(error ? extractError(error) : null);
				});
			}
		], callback);
	}

	removeUser(id, callback) {
		this.User.remove({ _id: id }, callback);
	}

	getDocument(documentId, callback) {
		async.waterfall([
			(callback) => {
				this.Document
					.findOne({ _id: documentId })
					.populate('author')
					.populate('comments')
					.populate('tags')
					.exec(callback);
			},
			(document, callback) => {
				if (document) {
					callback(null, document);
				} else {
					callback(new Error(messages.document_not_exist), null);
				}
			},
			(document, callback) => {
				async.parallel([
					(callback) => {
						this._populateComments(document.comments, callback);
					},
					(callback) => {
						async.filter(document.tags, function(tag, callback) {
							callback(null, (tag !== null));
						}, callback);
					}
				], function(error, results) {
					if (error) {
						callback(error, null);
					} else {
						document.comments = results[0];
						document.tags = results[1];

						callback(null, document);
					}
				});
			}
		], callback);
	}

	getDocumentHistory(indexId, callback) {
		this.DocumentIndex
			.findOne({ _id: indexId })
			.select('items')
			.exec(function(error, index) {
				if (error) {
					callback(error, null);
				} else {
					callback(null, index.items);
				}
			});
	}

	addDocument(document, callback) {
		async.waterfall([
			(callback) => {
				this.DocumentIndex.create({}, function (error, index) {
					if (error) {
						callback(error, null);
					} else {
						callback(null, index._id);
					}
				});
			},
			(indexId, callback) => {
				this._addDocument(indexId, document, callback);
			}
		], callback);
	}

	updateDocument(indexId, document, callback) {
		async.series([
			(callback) => {
				this._outdateDocument(indexId, document.author, callback);
			},
			(callback) => {
				this._addDocument(indexId, document, callback);
			}
		], callback);
	}

	removeDocument(indexId, callback) {
		async.series([
			(callback) => {
				this._outdateDocument(indexId, document.author, callback);
			},
			(callback) => {
				this.DocumentIndex.findOneAndUpdate({
					_id: indexId
				}, {
					$push: {
						items: null
					}
				}, {
					runValidators: true
				}, callback);
			}
		], callback);
	}

	searchDocument(tagId, lastId, callback) {
		async.waterfall([
			(callback) => {
				const filter = {
					latest: true,
				};

				if (tagId !== null) {
					filter.tags = { $in: [tagId] };
				}

				if (lastId !== null) {
					filter._id = { $gt: lastId };
				}

				this.Document
					.find(filter)
					.sort('-updatedAt')
					.limit(this.pagination)
					.populate('author')
					.populate('tags')
					.exec(callback);
			},
			(documents, callback) => {
				async.map(documents, function(document, callback) {
					async.parallel([
						(callback) => {
							callback(null, sanitizeUser(document.author));
						},
						(callback) => {
							async.filter(document.tags, function(tag, callback) {
								callback(null, (tag !== null));
							}, callback);
						}
					], function(error, results) {
						if (error) {
							callback(error, null);
						} else {
							document.author = results[0];
							document.tags = results[1];

							callback(null, document);
						}
					});
				}, callback);
			}
		], callback);
	}

	_addDocument(indexId, document, callback) {
		async.series([
			(callback) => {
				document.index = indexId;
				document.html = marked(document.markdown);

				this.Document.create(document, function (error, addedDocument) {
					if (error) {
						callback(extractError(error));
					} else {
						document = addedDocument;
						callback(null);
					}
				});
			},
			(callback) => {
				this.DocumentIndex.findOneAndUpdate({
					_id: document.index
				}, {
					$push: {
						items: document._id
					}
				}, {
					runValidators: true
				}, callback);
			},
			(callback) => {
				async.each(document.tags, (tagId, callback) => {
					this.incTagCount(tagId, callback);
				}, callback);
			}
		], function(error) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, document);
			}
		});
	}

	_outdateDocument(indexId, authorId, callback) {
		async.waterfall([
			(callback) => {
				this.DocumentIndex
					.findOne({ _id: indexId })
					.select({ items: { $slice: -1 } })
					.exec(callback);
			},
			(index, callback) => {
				const documentId = (index ? index.items[0] : null);

				if (documentId === null) {
					callback(null, null);
				} else {
					this.Document.findOne({
						_id: index.items[0],
						author: authorId
					}, callback);
				}
			},
			(document, callback) => {
				if (document) {
					callback(null, document);
				} else {
					callback(new Error(messages.document_not_exist), null);
				}
			},
			(document, callback) => {
				async.parallel([
					(callback) => {
						async.each(document.tags, (tagId, callback) => {
							this.decTagCount(tagId, callback);
						}, callback);
					},
					(callback) => {
						document.latest = false;
						document.save(callback);
					}
				], callback);
			}
		], callback);
	}

	addComment(documentId, comment, callback) {
		async.waterfall([
			(callback) => {
				this.Comment.create(comment, function (error, createdComment) {
					if (error) {
						callback(extractError(error), null)
					} else {
						callback(null, createdComment);
					}
				});
			},
			(createdComment, callback) => {
				this.Document.findOneAndUpdate({
					_id: documentId
				}, {
					$push: {
						comments: createdComment._id
					}
				}, {
					runValidators: true
				}, function (error) {
					if (error) {
						callback(extractError(error), null);
					} else {
						callback(null, createdComment);
					}
				});
			}
		], callback);
	}

	updateComment(id, comment, callback) {
		this.Comment.findOneAndUpdate({
			_id: id,
			author: comment.author
		}, comment, {
			runValidators: true
		}, function (error, comment) {
			if (error) {
				callback(extractError(error), null);
			} else if (!comment) {
				callback(new Error(messages.comment_not_exist), null);
			} else {
				callback(null, comment);
			}
		});
	}

	removeComment(id, author, callback) {
		this.Comment.remove({
			_id: id,
		 	author: author
		}, function(error, comment) {
			if (error) {
				callback(extractError(error), null);
			} else if (!comment) {
				callback(new Error(messages.comment_not_exist), null);
			} else {
				callback(null, comment);
			}
		});
	}

	_populateComments(comments, callback) {
		const result = [];

		async.each(comments, (rawComment, callback) => {
			if (rawComment) {
				async.waterfall([
					(callback) => {
						this.Comment.populate(rawComment, {
							path: 'author',
							model: this.User
						}, callback);
					},
					(comment, callback) => {
						comment.author = sanitizeUser(comment.author);
						result.push(comment);

						callback(null);
					}
				], callback);
			} else {
				callback(null);
			}
		}, function(error) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, result.sort(function(a, b) {
					return (b.createdAt - a.createdAt);
				}));
			}
		});
	}

	getTags(callback) {
		this.Tag
			.find()
			.sort([
				['count', -1],
				['title', 1]
			])
			.exec(callback);
	}

	findTag(title, callback) {
		this.Tag.findOne({ title: title }, callback);
	}

	addTag(title, color, callback) {
		this.Tag.create({
			title: title,
			color: color
		}, function (error, tag) {
			if (error) {
				callback(extractError(error), null);
			} else {
				callback(null, tag);
			}
		});
	}

	updateTag(id, tag, callback) {
		this.Tag.findOneAndUpdate({
			_id: id
		}, tag, {
			runValidators: true
		}, function (error, updatedTag) {
			if (error) {
				callback(extractError(error), null);
			} else if (!updatedTag) {
				callback(new Error(messages.tag_not_exist), null);
			} else {
				callback(null, updatedTag);
			}
		});
	}

	findOrAddTag(title, color, callback) {
		async.waterfall([
			(callback) => {
				this.findTag(title, callback);
			},
			(tag, callback) => {
				if (tag) {
					if (tag.color !== color) {
						this.updateTag(tag._id, { color: color }, callback);
					} else {
						callback(null, tag);
					}
				} else {
					this.addTag(title, color, callback);
				}
			}
		], callback);
	}

	incTagCount(id, callback) {
		this.Tag.findOneAndUpdate({
			_id: id
		}, {
			$inc: { count: +1 }
		}, callback);
	}

	decTagCount(id, callback) {
		this.Tag.findOneAndUpdate({
			_id: id
		}, {
			$inc: { count: -1 }
		}, callback);
	}

	removeTag(id, callback) {
		this.Tag.remove({ _id: id }, function(error, tag) {
			if (error) {
				callback(error);
			} else if (!tag) {
				callback(new Error(messages.tag_not_exist));
			} else {
				callback(null)
			}
		});
	}
}

module.exports = Model;