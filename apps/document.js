const async = require('async');

module.exports = function(config, express, model) {
	express.get(`${config.url}/document/get/:documentId`, function(req, res) {
		model.getDocument(req.params.documentId, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get(`${config.url}/document/history/:indexId`, function(req, res) {
		model.getDocumentHistory(req.params.indexId, function(error, history) {
			res.jsonAuto({
				error: error,
				history: history
			});
		});
	});

	express.post(`${config.url}/document/add`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			(callback) => {
				async.map(req.body.tags, function(reqTag, callback) {
					model.findOrAddTag(reqTag.title, reqTag.color, function(error, tag) {
						if (error) {
							callback(error, null);
						} else {
							callback(null, tag._id);
						}
					});
				}, callback);
			},
			(tagIds, callback) => {
				model.addDocument({
					author: req.user._id,
					title: req.body.title,
					markdown: req.body.markdown,
					tags: tagIds
				}, callback);
			}
		], function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.post(`${config.url}/document/update/:indexId`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			(callback) => {
				async.map(req.body.tags, function(reqTag, callback) {
					model.findOrAddTag(reqTag.title, reqTag.color, function(error, tag) {
						if (error) {
							callback(error, null);
						} else {
							callback(null, tag._id);
						}
					});
				}, callback);
			},
			(tagIds, callback) => {
				model.updateDocument(req.params.indexId, {
					author: req.user._id,
					title: req.body.title,
					markdown: req.body.markdown,
					tags: tagIds
				}, callback);
			}
		], function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get(`${config.url}/document/remove/:indexId`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const indexId = req.params.indexId;
		const authorId = req.user._id;

		model.removeDocument(indexId, authorId, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post(`${config.url}/document/search`, function(req, res) {
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