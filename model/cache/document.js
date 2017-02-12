function createModel(redis) {
	return {
		setDocument(document, callback) {
			document.isCached = true;
			redis.set(`document.${document.id}`, JSON.stringify(document), callback);
		},

		getDocument(id, callback) {
			redis.get(`document.${id}`, function(error, document) {
				if (error) {
					callback(error, null);
				} else {
					callback(null, JSON.parse(document));
				}
			});
		},

		clearDocument(id, callback) {
			redis.del(`document.${id}`, callback);
		}
	};
}

exports.createModel = createModel;