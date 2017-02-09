const async = require('async');

const PersistModel = require('./persist.js');
const CacheModel = require('./cache.js');

class KokotoModel {
	constructor(config) {
		this.persist = new PersistModel(config.database.persist);
		this.cache = new CacheModel(config.database.cache);

		this.config = config;
	}

	sync(force, callback) {
		this.persist
			.sync(force)
			.asCallback(callback);
	}

	getUser(id, callback) {
		this.persist
			.getUser(id)
			.then(function(user) {
				return user.finalize(null);
			})
			.asCallback(callback);
	}

	authUser(id, password, callback) {
		this.persist
			.authUser(id, password, null)
			.then(function(user) {
				return user.finalize(null);
			})
			.asCallback(callback);
	}

	searchUser(query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || '\0');

		this.persist
			.searchUser(query, [lastId, this.config.site.pagination], null)
			.map(function(user) {
				return user.finalize(null);
			})
			.asCallback(callback);
	}

	addUser(user, callback) {
		this.doWithTrx(this.persist.addUser, user, callback);
	}

	updateUser(id, user, callback) {
		this.doWithTrx(this.persist.updateUser, id, user, callback);
	}

	removeUser(id, callback) {
		this.doWithTrx(this.persist.removeUser, id, callback);
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

				this.persist
					.getDocument(id, null)
					.then(function(document) {
						return document.finalize(null);
					})
					.then((document) => {
						this.cache.saveDocument(document);
						return document;
					})
					.asCallback(callback);
			}
		], callback);
	}

	searchDocument(type, query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || -1);

		this.persist
			.searchDocument(type, query, [lastId, this.config.site.pagination], null)
			.map(function(document) {
				return document.finalize(null);
			})
			.asCallback(callback);
	}

	addDocument(document, callback) {
		this.doWithTrx(this.persist.addDocument, document, callback);
	}

	updateDocument(id, document, callback) {
		this.doWithTrx(this.persist.updateDocument, id, document, callback);
	}

	archiveDocument(id, callback) {
		this.doWithTrx(this.persist.archiveDocument, id, callback);
	}

	getFile(id, callback) {
		this.doWithoutTrx(this.persist.getFile, id, callback);
	}

	searchFile(type, query, lastId, callback) {
		query = (query || '');
		lastId = (lastId || -1);

		this.persist
			.searchFile(type, query, [lastId, this.config.site.pagination], null)
			.map(function(file) {
				return file.finalize(null);
			})
			.asCallback(callback);
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
						this.cache.saveTagSearch(query, lastId, tags);
						return tags;
					})
					.asCallback(callback);
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

		method.apply(this.persist, args).then(function(result) {
			return result.finalize(null);
		}).asCallback(callback);
	}

	doWithTrx(method, ...args) {
		const callback = args.pop();

		this.persist.client.transaction((trx) => {
			args.push(trx);

			return method.apply(this.persist, args).then(function(result) {
				return result.finalize(null);
			});
		}).asCallback(callback);
	}
}

module.exports = KokotoModel;