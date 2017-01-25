const _ = require('lodash');
const redis = require('redis');

const messages = require('../static/messages.json')

class CacheModel {
	constructor(cacheConfig) {
		if (cacheConfig) {
			if (_.isArray(cacheConfig)) {
				this.client = redis.createClient.apply(redis, cacheConfig);
			} else {
				this.client = redis.createClient(cacheConfig);
			}
		} else {
			this.client = null;
		}
	}

	saveDocument(document, callback) {
		this.do('hset', 'document', document.id, JSON.stringify(document), callback);
	}

	loadDocument(id, callback) {
		this.do('hget', 'document', id, function(error, document) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, JSON.parse(document));
			}
		});
	}

	clearDocument(callback) {
		this.do('del', 'document', callback);
	}

	saveTagSearch(query, tags, callback) {
		this.do('hset', 'tags', query, JSON.stringify(tags), callback);
	}

	loadTagSearch(query, callback) {
		if (!query) {
			query = '';
		}

		this.do('hget', 'tags', query, function(error, tags) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, JSON.parse(tags));
			}
		});
	}

	clearTagSearch(callback) {
		this.do('del', 'tags', callback);
	}

	do(method, ...args) {
		if (this.client === null) {
			const callback = _.last(args);

			if (_.isFunction(callback)) {
				callback(new Error(messages.cache_not_configured));
			}
		} else {
			this.client[method].apply(this.client, args);
		}
	}
}

module.exports = CacheModel;