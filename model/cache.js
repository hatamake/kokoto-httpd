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
		const key = `document.${document.id}`;
		const value = JSON.stringify(document);

		this.client.set(key, value, callback);
	}

	loadDocument(id, callback) {
		const key = `document.${id}`;

		this.client.get(key, function(error, document) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, JSON.parse(document));
			}
		});
	}

	clearDocument(id, callback) {
		this.client.del(`document.${id}`, callback);
	}
}

module.exports = CacheModel;