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

	express.get('/tag/findOrAdd/:title', function(req, res) {
		const {title} = req.params;

		async.waterfall([
			function(callback) {
				models.findTag(title, callback);
			},
			function(tag, callback) {
				if (tag) {
					callback(null, tag._id);
				} else {
					models.addTag(title, callback);
				}
			}
		], function(error, tagId) {
			res.jsonAuto({
				error: error,
				tag: {
					_id: (tagId || null)
				}
			});
		});
	});

	express.post('/tag/paint/:id', function(req, res) {
		const {id} = req.params;
		const {color} = req.body;

		models.paintTag(id, color, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};