const _ = require('lodash');
const async = require('async');

const {diffBlocks} = require('../util/diff');

module.exports = function(express, model, config) {
	express.post(`${config.url}/document`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const authorId = req.session.user.id;
		const {title} = req.body;
		const content = (req.body.content || '');
		const tags = (req.body.tags || []);

		model.document.create(authorId, title, content, tags, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get(`${config.url}/document/search`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {type, query, after} = req.query;

		model.document.search(type, query, after, function(error, documents) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});

	express.get(`${config.url}/document/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.document.get(req.params.id, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.get(`${config.url}/document/:id/history`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				model.document.get(req.params.id, callback);
			},
			function(document, callback) {
				model.document.search('history', document.historyId, -1, callback);
			}
		], function(error, documents) {
			res.jsonAuto({
				error: error,
				documents: documents
			});
		});
	});

	express.get(`${config.url}/document/:id/diff`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const thisId = req.params.id;
		const thatId = req.query.to;

		async.waterfall([
			function(callback) {
				async.map([thisId, thatId], function(id, callback) {
					model.document.get(id, callback);
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
		const {id} = req.params;
		const {title} = req.body;
		const content = (req.body.content || '');
		const tags = (req.body.tags || []);

		model.document.update(id, authorId, title, content, tags, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
			});
		});
	});

	express.delete(`${config.url}/document/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const userId = req.session.user.id;

		model.document.archive(id, userId, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post(`${config.url}/document/:id/comment`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const authorId = req.session.user.id;
		const {content, range} = req.body;

		model.document.addComment(id, authorId, content, range, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.put(`${config.url}/document/:id/comment/:commentId`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id, commentId} = req.params;
		const authorId = req.session.user.id;
		const {content} = req.body;

		model.document.updateComment(id, commentId, authorId, content, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.delete(`${config.url}/document/:id/comment/:commentId`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id, commentId} = req.params;
		const userId = req.session.user.id;

		model.document.removeComment(id, commentId, userId, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};