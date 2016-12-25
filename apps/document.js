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
		}, function(error, documentId) {
			res.jsonAuto({
				error: error,
				document: {
					_id: documentId
				}
			});
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

	express.post('/document/search', function(req, res) {
		const tagId = (req.body.tag || null);
		const lastId = (req.body.after || null);

		models.searchDocument(tagId, lastId, function(error, documents) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});
};