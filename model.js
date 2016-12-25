const async = require('async');

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
		callback(null, shasum(user.password));
	}
}

class Model {
	constructor(config, mongoose) {
		this.pagination = config.pagination;

		const Schema = mongoose.Schema;
		const ObjectId = Schema.ObjectId;

		this.User = mongoose.model('User', {
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
		});

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
				required: [true, messages.title_required],
				unique: [true, messages.title_exist]
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
				required: true,
				default: []
			},
			tags: {
				type: [{ type: ObjectId, ref: 'Tag' }],
				required: true,
				default: []
			}
		}, {
				timestamps: true
			}));

		this.DocumentIndex = mongoose.model('DocumentIndex', new Schema({
			items: {
				type: [{ type: ObjectId, ref: 'Document' }],
				required: true,
				default: []
			},
			lastItem: {
				type: ObjectId,
				ref: 'Document',
				required: true,
				default: null
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
			position: {
				type: [{ type: Number }],
				required: true
			},
			tags: {
				type: [{ type: ObjectId, ref: 'Tag' }],
				required: true,
				default: []
			}
		}, {
				timestamps: true
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
	}

	getUser(id, callback) {
		this.User.findOne({ _id: id }, callback);
	}

	authUser(username, password, callback) {
		this.User.findOne({
			username: username,
			password: shasum(password)
		}, function (error, user) {
			if (error) {
				callback(error, null)
			} else if (count !== 1) {
				callback(null, null);
			} else {
				callback(null, user._id);
			}
		});
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
						callback(null, addedUser._id);
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
		])
	}

	removeUser(id, callback) {
		this.User.remove({ _id: id }, callback);
	}

	getDocument(id, callback) {
		this.Document
			.findOne({ _id: id })
			.populate('author')
			.populate('comments')
			.populate('tags')
			.exec(function (error, document) {
				if (error) {
					callback(error, null);
				} else if (!document) {
					callback(new Error(messages.cannot_find_document), null);
				} else {
					callback(null, document);
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
			},
			(callback) => {
				callback(null, indexId);
			}
		], callback);
	}

	updateDocument(indexId, document, callback) {
		async.series([
			(callback) => {
				this._outdateDocument(indexId, callback);
			},
			(callback) => {
				this._addDocument(indexId, document, callback);
			}
		], callback);
	}

	removeDocument(indexId, callback) {
		async.parallel([
			(callback) => {
				this._outdateDocument(indexId, callback);
			},
			(callback) => {
				this.DocumentIndex.findOneAndUpdate({
					_id: indexId
				}, {
					$push: {
						items: null
					},
					lastItem: null
				}, {
					runValidators: true
				}, callback);
			}
		], callback);
	}

	searchDocument(tagId, lastId, callback) {
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
			.sort('updatedAt')
			.limit(this.pagination)
			.exec(callback);
	}

	_addDocument(indexId, document, callback) {
		async.waterfall([
			(callback) => {
				document.index = indexId;

				this.Document.create(document, function (error, addedDocument) {
					if (error) {
						callback(extractError(error), null);
					} else {
						callback(null, addedDocument._id);
					}
				});
			},
			(documentId, callback) => {
				this.DocumentIndex.findOneAndUpdate({
					_id: indexId
				}, {
					$push: {
						items: documentId
					},
					lastItem: documentId
				}, {
					runValidators: true
				}, callback);
			},
			(callback) => {
				async.each(document.tags, (tagId, callback) => {
					this.incTagCount(tagId, callback);
				}, callback);
			}
		], callback);
	}

	_outdateDocument(indexId, callback) {
		async.waterfall([
			(callback) => {
				this.DocumentIndex
					.findOne({ _id: indexId })
					.select('lastItem')
					.exec(callback);
			},
			(index, callback) => {
				this.Document.findOne({
					_id: index.lastItem
				}, callback);
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
		async.parallel([
			(callback) => {
				async.waterfall([
					(callback) => {
						this.Comment.create(comment, function (error, createdComment) {
							if (error) {
								callback(extractError(error), null)
							} else {
								callback(null, createdComment._id);
							}
						});
					},
					(commentId, callback) => {
						this.Document.findOneAndUpdate({
							_id: documentId
						}, {
							$push: {
								comments: commentId
							}
						}, {
							runValidators: true
						}, function (error) {
							callback(error ? extractError(error) : null);
						});
					}
				], callback);
			},
			(callback) => {
				async.each(comment.tags, (tagId, callback) => {
					this.incTagCount(tagId, callback);
				}, callback);
			}
		]);
	}

	updateComment(id, comment, callback) {
		async.parallel([
			(callback) => {
				_decCommentTagCount(id, callback);
			},
			(callback) => {
				this.Comment.findOneAndUpdate({
					_id: id
				}, comment, {
					runValidators: true
				}, function (error) {
					callback(error ? extractError(error) : null);
				});
			},
			(callback) => {
				async.each(comment.tags, (tagId, callback) => {
					this.incTagCount(tagId, callback);
				}, callback);
			}
		], callback);
	}

	removeComment(id, callback) {
		async.parallel([
			(callback) => {
				this._decCommentTagCount(id, callback);
			},
			(callback) => {
				this.comment.remove({ _id: id }, callback);
			}
		], callback);
	}

	_decCommentTagCount(id, callback) {
		async.waterfall([
			(callback) => {
				this.Comment
					.findOne({ _id: id })
					.select('tags')
					.exec(callback);
			},
			(comment, callback) => {
				async.each(comment.tags, (tagId, callback) => {
					this.decTagCount(tagId, callback);
				}, callback);
			}
		], callback);
	}

	getTags(callback) {
		this.Tag
			.find()
			.sort('count')
			.exec(callback);
	}

	findTag(title, callback) {
		this.Tag.findOne({ title: title }, callback);
	}

	addTag(title, callback) {
		this.Tag.create({
			title: title
		}, function (error, tag) {
			if (error) {
				callback(extractError(error), null);
			} else {
				callback(null, tag._id);
			}
		});
	}

	paintTag(id, color, callback) {
		this.Tag.findOneAndUpdate({
			_id: id
		}, {
			color: color
		}, {
			runValidators: true
		}, function (error) {
			callback(error ? extractError(error) : null);
		});
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
		this.Tag.remove({ _id: id }, callback);
	}
}

module.exports = Model;