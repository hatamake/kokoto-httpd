module.exports = function(config, express, models) {
	express.get('/tag/list', function(req, res) {
		models.getTags(function(error, tags) {
			res.jsonAuto({
				error: error,
				tags: tags
			});
		});
	});
};