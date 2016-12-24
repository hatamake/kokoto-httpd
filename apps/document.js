module.exports = function(config, express, models) {
	express.get('/document/get/:documentId', function(req, res) {
		models.getDocument(req.params.documentId, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.post('/document/add', function(req, res) {
		if (res.shouldSignin()) { return; }

		models.addDocument({
			author: req.user._id,
			title: req.body.title,
			markdown: req.body.markdown
		}, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post('/document/update/:indexId', function(req, res) {
		if (res.shouldSignin()) { return; }

		models.updateDocument(req.params.indexId, {
			author: req.user._id,
			title: req.body.title,
			markdown: req.body.markdown
		}, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.get('/document/remove/:indexId', function(req, res) {
		if (res.shouldSignin()) { return; }

		models.removeDocument(req.params.indexId, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post('/document/search/:tagId', function(req, res) {
		const {tagId} = req.params;
		const {lastId} = req.body;

		models.searchDocument(tagId, lastId, function(error, result) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});
};