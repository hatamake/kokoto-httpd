function createModel(redis) {
	return {
		setFile(file, callback) {
			file.isCached = true;
			redis.set(`file.${file.id}`, JSON.stringify(file), callback);
		},

		getFile(id, callback) {
			redis.get(`file.${id}`, function(error, file) {
				if (error) {
					callback(error, null);
				} else {
					callback(null, JSON.parse(file));
				}
			});
		},

		clearFile(id, callback) {
			redis.del(`file.${id}`, callback);
		}
	};
}

exports.createModel = createModel;