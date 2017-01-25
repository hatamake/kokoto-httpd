const async = require('async');
const Promise = require('bluebird');

const PersistModel = require('./persist.js');
const CacheModel = require('./cache.js');

function callbackToPromise(callback, promise) {
	return new Promise(function(resolve, reject) {
		callback(function(error) {
			if (error) {
				reject(error);
			} else if (arguments.length <= 2) {
				resolve(arguments[1]);
			} else {
				resolve(Array.prototype.splice.call(arguments, 1));
			}
		});
	})
}

function promiseToCallback(promise, callback) {
	promise.then(function(result) {
		callback(null, result);
	}).catch(function(error) {
		callback(error, null);
	});
}

class KokotoModel {
	constructor(config) {
		this.persist = new PersistModel(config.database.persist);
		this.cache = new CacheModel(config.database.cache);

		this.config = config;
	}

	sync(callback) {
		this.persist.sync()
			.then(function() {
				callback(null);
			})
			.catch(function(error) {
				callback(error);
			});
	}

	getUser(id, callback) {
		const promise = this.persist
			.getUser(id)
			.then(function(user) {
				return user.finalize(null);
			});
		
		promiseToCallback(promise, callback);
	}

	authUser(username, password, callback) {
		const promise = this.persist
			.authUser(username, password, null)
			.then(function(user) {
				return user.finalize(null);
			});

		promiseToCallback(promise, callback);
	}

	addUser(user, callback) {
		this.doWithTrx(
			this.persist.addUser, user,
			callback
		);
	}

	updateUser(id, user, callback) {
		this.doWithTrx(
			this.persist.updateUser, id, user,
			callback
		);
	}

	removeUser(id, callback) {
		this.doWithTrx(
			this.persist.removeUser, id,
			callback
		);
	}

	getDocument(id, needParse, callback) {
		async.waterfall([
			(callback) => {
				this.cache.loadDocument(id, function(error, cachedDocument) {
					callback(null, cachedDocument);
				});
			},
			(cachedDocument, callback) => {
				if (cachedDocument) {
					callback(null, cachedDocument);
					return;
				}

				const promise = this.persist
					.getDocument(id, null)
					.then(function(document) {
						return document.finalize(null);
					});

				promiseToCallback(promise, callback);
			},
			(document, callback) => {
				if (needParse && !document.parsedConetnt) {
					callback(null, document);
					this.cache.saveDocument(document);
					return;
				}

				callback(null, document);
			}
		], callback);
	}

	searchDocument(type, query, lastId, callback) {
		const promise = this.persist
			.searchDocument(
				type, query,
				[(lastId || -1), this.config.pagination],
				null
			)
			.map(function(document) {
				return document.finalize(null);
			});

		promiseToCallback(promise, callback);
	}

	addDocument(document, callback) {
		this.doWithTrx(
			this.persist.addDocument, document,
			callback
		);
	}

	updateDocument(id, document, callback) {
		this.doWithTrx(
			this.persist.updateDocument, id, document,
			callback
		);
	}

	archiveDocument(id, callback) {
		this.doWithTrx(
			this.persist.archiveDocument, id,
			callback
		);
	}

	searchTag(query, lastId, callback) {
		async.waterfall([
			(callback) => {
				this.cache.loadTagSearch(query, callback);
			},
			(cachedTags, callback) => {
				if (cachedTags) {
					callback(null, cachedTags);
					return;
				}

				const promise = this.persist
					.searchTag(query, [(lastId || -1), this.config.pagination], null)
					.map(function(tag) {
						return tag.finalize(null);
					})
					.then(function(tags) {
						callback(null, tags);
						this.cache.saveTagSearch(query, tags);
					})
					.catch(function(error) {
						callback(error, null);
					});
			}
		], callback);
	}

	updateTag(id, tag, callback) {
		this.doWithTrx(
			this.persist.updateTag, id, tag,
			callback
		);

		this.cache.clearDocument();
		this.cache.clearTagSearch();
	}

	removeTag(id, callback) {
		this.doWithTrx(
			this.persist.removeTag, id,
			callback
		);

		this.cache.clearDocument();
		this.cache.clearTagSearch();
	}

	addComment(documentId, comment, callback) {
		this.doWithTrx(
			this.persist.addComment, documentId, comment,
			callback
		);

		this.cache.clearDocument();
	}

	updateComment(id, comment, callback) {
		this.doWithTrx(
			this.persist.updateComment, id, comment,
			callback
		);

		this.cache.clearDocument();
	}

	removeComment(id, callback) {
		this.doWithTrx(
			this.persist.removeComment, id,
			callback
		);

		this.cache.clearDocument();
	}

	doWithoutTrx(method, ...args) {
		const callback = args.pop();

		const promise = method.apply(this.persist, args).then(function(result) {
			return result.finalize(null);
		});

		promiseToCallback(promise, callback);
	}

	doWithTrx(method, ...args) {
		const callback = args.pop();

		const promise = this.persist.client.transaction((trx) => {
			args.push(trx);

			return method.apply(this.persist, args).then(function(result) {
				return result.finalize(null);
			});
		});

		promiseToCallback(promise, callback);
	}
}

module.exports = KokotoModel;