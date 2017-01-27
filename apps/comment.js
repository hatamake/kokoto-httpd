module.exports = function(express, model, config) {
	express.post(`${config.url}/comment`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {documentId, content, range} = req.body;

		model.addComment(documentId, {
			authorId: req.session.user.id,
			content: content,
			range: range
		}, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.put(`${config.url}/comment/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id, content} = req.body;

		model.updateComment(id, {
			authorId: req.session.user.id,
			content: content
		}, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.delete(`${config.url}/comment/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.removeComment(req.params.id, function(error) {
			res.jsonAuto({
				error: error
			});
		});
	});
};