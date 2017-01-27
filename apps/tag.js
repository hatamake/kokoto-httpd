module.exports = function(express, model, config) {
	express.get(`${config.url}/tag/search`, function(req, res) {
		const {query, after} = req.query;

		model.searchTag(query, after, function(error, tags) {
			res.jsonAuto({
				error: error,
				tags: tags
			});
		});
	});

	express.put(`${config.url}/tag/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const {title, color} = req.body;

		model.updateTag(id, {
			title: title,
			color: color
		}, function(error, tag) {
			res.jsonAuto({
				error: error,
				tag: tag
			});
		});
	});

	express.delete(`${config.url}/tag/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.removeTag(req.params.id, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};