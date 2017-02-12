const async = require('async');
const path = require('path');
const fs = require('fs');

const messages = require('../static/messages.json');
const {parseIncomingForm} = require('../util/formidable');

function rollbackUpload(files, callback) {
	async.each(files, function(file, callback) {
		fs.unlink(file.path, callback);
	}, function() {
		callback(new Error(messages.request_invalid));
	});
}

module.exports = function(express, model, config) {
	const uploadDirPath = path.join(__dirname, '..', 'static', 'file');

	express.post(`${config.url}/file`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				parseIncomingForm(req, uploadDirPath, callback);
			},
			function(fields, files, callback) {
				if (files.stream) {
					const authorId = req.session.user.id;
					const filename = path.basename(files.stream.path);
					const content = (fields.content || '');
					const tags = JSON.parse(fields.tags || '[]');

					model.file.create(authorId, filename, content, tags, callback);
				} else {
					rollbackUpload(files, callback);
				}
			}
		], function(error, file) {
			res.jsonAuto({
				error: error,
				file: file
			});
		});
	});

	express.get(`${config.url}/file/search`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {query, type, after} = req.query;

		model.file.search(type, query, after, function(error, files) {
			res.jsonAuto({
				error: error,
				files: files
			});
		});
	});

	express.get(`${config.url}/file/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		model.file.get(req.params.id, function(error, file) {
			res.jsonAuto({
				error: error,
				file: file
			});
		});
	});

	express.get(`${config.url}/file/:id/stream`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				model.file.get(req.params.id, callback);
			},
			function(file, callback) {
				res.sendFile(path.join(uploadDirPath, file.filename), callback);
			}
		], function(error) {
			if (error) {
				res.jsonAuto({ error: error });
			}
		});
	});

	express.get(`${config.url}/file/:id/history`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				model.get.get(req.params.id, callback);
			},
			function(file, callback) {
				model.file.search('history', file.historyId, -1, callback);
			}
		], function(error, files) {
			res.jsonAuto({
				error: error,
				files: files
			});
		});
	});

	express.put(`${config.url}/file/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				parseIncomingForm(req, uploadDirPath, callback);
			},
			function(fields, files, callback) {
				if (files.stream) {
					const authorId = req.session.user.id;
					const filename = path.basename(files.stream.path);
					const content = (fields.content || '');
					const tags = JSON.parse(fields.tags || '[]');

					model.file.update(authorId, filename, content, tags, callback);
				} else {
					rollbackUpload(files, callback);
				}
			}
		], function(error, file) {
			res.jsonAuto({
				error: error,
				file: file
			});
		});
	});

	express.delete(`${config.url}/file/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const userId = req.session.user.id;

		model.archiveFile(id, userId, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post(`${config.url}/file/:id/comment`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id} = req.params;
		const authorId = req.session.user.id;
		const {content} = req.body;

		model.file.addComment(id, authorId, content, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.put(`${config.url}/file/:id/comment/:commentId`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id, commentId} = req.params;
		const authorId = req.session.user.id;
		const {content} = req.body;

		model.file.updateComment(id, commentId, authorId, content, function(error, comment) {
			res.jsonAuto({
				error: error,
				comment: comment
			});
		});
	});

	express.delete(`${config.url}/file/:id/comment/:commentId`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {id, commentId} = req.params;
		const userId = req.session.user.id;

		model.file.removeComment(id, commentId, userId, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};