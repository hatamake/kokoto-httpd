const async = require('async');

module.exports = function(config, express, models) {
	express.get('/tag/list', function(req, res) {
		models.getTags(function(error, tags) {
			res.jsonAuto({
				error: error,
				tags: tags
			});
		});
	});

	express.post('/tag/paint/:id', function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const {color} = req.body;

		models.paintTag(id, color, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};