function createModel(redis) {
	return {
		getTags(title, lastId, callback) {
			redis.hget('tags', `${title}.${lastId}`, function(error, tags) {
				if (error) {
					callback(error, null);
				} else {
					callback(null, JSON.parse(tags));
				}
			});
		},

		setTags(title, lastId, tags, callback) {
			redis.hset('tags', `${title}.${lastId}`, JSON.stringify(tags), callback);
		},

		clearAllTags(callback) {
			redis.del('tags', callback);
		}
	};
}

exports.createModel = createModel;