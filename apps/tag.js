module.exports = function(config, express, model) {
	express.get(`${config.url}/tag/list`, function(req, res) {
		model.getTags(function(error, tags) {
			res.jsonAuto({
				error: error,
				tags: tags
			});
		});
	});

	express.post(`${config.url}/tag/update/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const {title, color} = req.body;

		model.updateTag(id, {
			title: title,
			color: color
		}, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};