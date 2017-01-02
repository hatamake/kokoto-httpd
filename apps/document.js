const async = require('async');

module.exports = function(config, express, model) {
	express.get('/document/get/:documentId', function(req, res) {
		model.getDocument(req.params.documentId, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get('/document/history/:indexId', function(req, res) {
		model.getDocumentHistory(req.params.indexId, function(error, history) {
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
					model.findOrAddTag(tag.title, tag.color, callback);
				}, callback);
			},
			(tags, callback) => {
				model.addDocument({
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

		async.waterfall([
			(callback) => {
				async.map(req.body.tags, function(tag, callback) {
					model.findOrAddTag(tag.title, tag.color, callback);
				}, callback);
			},
			(tags, callback) => {
				model.updateDocument(req.params.indexId, {
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

	express.get('/document/remove/:indexId', function(req, res) {
		if (res.shouldSignin()) { return; }

		model.removeDocument(req.params.indexId, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post('/document/search', function(req, res) {
		const tagId = (req.body.tag || null);
		const lastId = (req.body.after || null);

		model.searchDocument(tagId, lastId, function(error, documents) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});
};