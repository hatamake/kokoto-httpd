module.exports = function(express, model, config) {
	express.get(`${config.url}/tag/search`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const query = (req.query.query || '');
		const {after} = req.query;

		model.tag.search(query, after, function(error, tags) {
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

		model.tag.update(id, title, color, function(error, tag) {
			res.jsonAuto({
				error: error,
				tag: tag
			});
		});
	});

	express.delete(`${config.url}/tag/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;

		model.tag.remove(id, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};