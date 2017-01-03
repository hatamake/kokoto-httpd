module.exports = function(config, express, model) {
	express.post(`${config.url}/comment/add`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {documentId, content, range} = req.body;

		model.addComment(documentId, {
			author: req.user._id,
			content: content,
			range: range
		}, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.post(`${config.url}/comment/update/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id, content} = req.body;

		model.updateComment(id, {
			author: req.user._id,
			content: content
		}, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.get(`${config.url}/comment/remove/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.removeComment(req.params.id, req.user._id, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};