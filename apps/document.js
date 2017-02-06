const _ = require('lodash');
const async = require('async');
const JsDiff = require('diff');

const messages = require('../static/messages.json');

JsDiff.diffBlocks = function(a, b) {
	return JsDiff.diffLines(a, b).reduce(function(result, item) {
		const lastItem = (_.last(result) || {});

		if (item.added && lastItem.removed) {
			lastItem.added = true;
			lastItem.value = JsDiff.diffWords(lastItem.value, item.value);
		} else {
			result.push(item);
		}

		return result;
	}, []);
};

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
		model.getDocument(req.params.id, function(error, document) {
			res.jsonAuto({
				error: error,
				document: document
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

				const diff = JsDiff.diffBlocks(thisContent, thatContent);

				callback(null, diff);
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

		model.archiveDocument(req.params.id, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};