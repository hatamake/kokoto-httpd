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
		this.doAndClearDocumentCache(
			this.persist.archiveDocument, id,
			document => document.id,
			callback
		);
	}

	searchTag(query, lastId, callback) {
		this.doWithoutTrx(
			this.persist.searchTag, query, lastId,
			callback
		);
	}

	updateTag(id, tag, callback) {
		this.doAndClearDocumentCache(
			this.persist.updateTag, id, tag,
			tag => tag.DocumentToTag.DocumentId,
			callback
		);
	}

	removeTag(id, callback) {
		this.doAndClearDocumentCache(
			this.persist.removeTag, id,
			tag => tag.DocumentToTag.DocumentId,
			callback
		);
	}

	addComment(documentId, comment, callback) {
		this.doAndClearDocumentCache(
			this.persist.addComment, documentId, comment,
			comment => comment.documentId,
			callback
		);
	}

	updateComment(id, comment, callback) {
		this.doAndClearDocumentCache(
			this.persist.updateComment, id, comment,
			comment => comment.documentId,
			callback
		);
	}

	removeComment(id, callback) {
		this.clearDocumentCache(
			this.persist.removeComment, id,
			comment => comment.documentId,
			callback
		);
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

	doAndClearDocumentCache(persistMethod, ...args) {
		const callback = args.pop();
		const toId = args.pop();

		const promise = this.persist.client.transaction((trx) => {
			args.push(trx);

			return persistMethod.apply(this.persist, args).then((result) => {
				const documentId = toId(result);

				let clearDocumentCache = this.cache.clearDocument.bind(this.cache, documentId);
				clearDocumentCache = callbackToPromise(clearDocumentCache);

				return clearDocumentCache.then(function() {
					return result.finalize(null);
				});
			});
		});

		promiseToCallback(promise, callback);
	}
}

module.exports = KokotoModel;