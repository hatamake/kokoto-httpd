const async = require('async');

module.exports = function(express, model, config) {
	express.post(`${config.url}/document`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.addDocument({
			authorId: req.session.user.id,
			title: req.body.title,
			content: req.body.content,
			tags: req.body.tags
		}, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get(`${config.url}/document/search`, function(req, res) {
		const {query, type, after} = req.query;

		model.searchDocument(type, query, after, function(error, documents) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});

	express.get(`${config.url}/document/:id`, function(req, res) {
		const id = req.params.id;

		model.getDocument(id, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.put(`${config.url}/document/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.updateDocument(req.params.id, {
			authorId: req.session.user.id,
			title: req.body.title,
			content: req.body.content,
			tags: req.body.tags
		}, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.delete(`${config.url}/document/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.archiveDocument(id, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};