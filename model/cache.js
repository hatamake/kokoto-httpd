const _ = require('lodash');
const redis = require('redis');

class CacheModel {
	constructor(cacheConfig) {
		if (_.isArray(cacheConfig)) {
			this.client = redis.createClient.apply(redis, cacheConfig);
		} else {
			this.client = redis.createClient(cacheConfig);
		}
	}

	saveDocument(document, callback) {
		this.client.hset('document', document.id, JSON.stringify(document), callback);
	}

	loadDocument(id, callback) {
		this.client.hget('document', id, function(error, document) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, JSON.parse(document));
			}
		});
	}

	clearDocument(callback) {
		this.client.del('document', callback);
	}

	saveTagSearch(query, tags, callback) {
		this.client.hset('tags', query, JSON.stringify(tags), callback);
	}

	loadTagSearch(query, callback) {
		this.client.hget('tags', tags, function(error, tags) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, JSON.parse(tags));
			}
		});
	}

	clearTagSearch(callback) {
		this.client.del('tags', callback);
	}
}

module.exports = CacheModel;