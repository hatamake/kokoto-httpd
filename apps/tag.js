const async = require('async');

module.exports = function(config, express, model) {
	express.get('/tag/list', function(req, res) {
		model.getTags(function(error, tags) {
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

		model.paintTag(id, color, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};