const async = require('async');

const PersistModel = require('./persist.js');
const CacheModel = require('./cache.js');

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

	sync(force, callback) {
		promiseToCallback(this.persist.sync(force), callback);
	}

	getUser(id, callback) {
		const promise = this.persist
			.getUser(id)
			.then(function(user) {
				return user.finalize(null);
			});
		
		promiseToCallback(promise, callback);
	}

	authUser(id, password, callback) {
		const promise = this.persist
			.authUser(id, password, null)
			.then(function(user) {
				return user.finalize(null);
			});

		promiseToCallback(promise, callback);
	}

	searchUser(query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || '\0');

		const promise = this.persist
			.searchUser(query, [lastId, this.config.site.pagination], null)
			.map(function(user) {
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

	getDocument(id, callback) {
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
					})
					.then((document) => {
						this.cache.saveDocument(document);
						return document;
					});

				promiseToCallback(promise, callback);
			}
		], callback);
	}

	searchDocument(type, query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || -1);

		const promise = this.persist
			.searchDocument(type, query, [lastId, this.config.site.pagination], null)
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

	getFile(id, callback) {
		this.doWithoutTrx(
			this.persist.getFile, id,
			callback
		);
	}

	searchFile(type, query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || -1);

		const promise = this.persist
			.searchFile(type, query, [lastId, this.config.site.pagination], null)
			.map(function(file) {
				return file.finalize(null);
			});

		promiseToCallback(promise, callback);
	}

	addFile(file, callback) {
		this.doWithTrx(this.persist.addFile, file, callback);
	}

	updateFile(id, file, callback) {
		this.doWithTrx(this.persist.updateFile, id, file, callback);
	}

	archiveFile(id, callback) {
		this.doWithTrx(this.persist.archiveFile, id, callback);
	}

	searchTag(query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || -1);

		async.waterfall([
			(callback) => {
				this.cache.loadTagSearch(query, lastId, function(error, cachedTags) {
					callback(null, cachedTags);
				});
			},
			(cachedTags, callback) => {
				if (cachedTags) {
					callback(null, cachedTags);
					return;
				}

				this.persist
					.searchTag(query, [lastId, this.config.site.pagination], null)
					.map(function(tag) {
						return tag.finalize(null);
					})
					.then((tags) => {
						callback(null, tags);
						this.cache.saveTagSearch(query, lastId, tags);
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