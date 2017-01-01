const async = require('async');

module.exports = function(config, express, models) {
	express.get('/document/get/:documentId', function(req, res) {
		models.getDocument(req.params.documentId, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get('/document/history/:indexId', function(req, res) {
		models.getDocumentHistory(req.params.indexId, function(error, history) {
			res.jsonAuto({
				error: error,
				history: history
			});
		});
	});

	express.post('/document/add', function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			(callback) => {
				async.map(req.body.tags, function(tag, callback) {
					models.findOrAddTag(tag.title, tag.color, callback);
				}, callback);
			},
			(tags, callback) => {
				models.addDocument({
					author: req.user._id,
					title: req.body.title,
					markdown: req.body.markdown,
					tags: tags
				}, callback);
			}
		], function(error, indexId) {
			res.jsonAuto({
				error: error,
				index: {
					_id: indexId
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