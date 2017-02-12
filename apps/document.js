const _ = require('lodash');
const async = require('async');

const {diffBlocks} = require('../util/diff');

module.exports = function(express, model, config) {
	express.post(`${config.url}/document`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.addDocument({
			authorId: req.session.user.id,
			revision: 1,
			title: req.body.title,
			content: (req.body.content || ''),
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
		model.getDocument(req.params.id, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get(`${config.url}/document/:id/history`, function(req, res) {
		async.waterfall([
			function(callback) {
				model.getDocument(req.params.id, callback);
			},
			function(document, callback) {
				model.searchDocument('history', document.historyId, null, callback);
			}
		], function(error, documents) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});

	express.get(`${config.url}/document/:id/diff`, function(req, res) {
		const thisId = req.params.id;
		const thatId = req.query.to;

		async.waterfall([
			function(callback) {
				async.map([thisId, thatId], function(id, callback) {
					model.getDocument(id, callback);
				}, callback);
			},
			function(documents, callback) {
				const thisContent = documents[0].content;
				const thatContent = documents[1].content;
				callback(null, diffBlocks(thisContent, thatContent));
			}
		], function(error, diff) {
			res.jsonAuto({
				error: error,
				diff: diff
			});
		});
	});

	express.put(`${config.url}/document/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const authorId = req.session.user.id;
		const {historyId, revision, title, content, tags} = req.body;

		model.updateDocument(req.params.id, {
			historyId: historyId,
			revision: revision,
			authorId: authorId,
			title: title,
			content: content,
			tags: tags
		}, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.delete(`${config.url}/document/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.archiveDocument(req.params.id, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};