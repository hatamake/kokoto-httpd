const async = require('async');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

const messages = require('../static/messages.json');

module.exports = function(express, model, config) {
	const uploadDirPath = path.join(__dirname, '..', 'static', 'file');

	express.post(`${config.url}/file`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				const form = new formidable.IncomingForm();

				form.uploadDir = uploadDirPath;
				form.keepExtensions = true;

				form.parse(req, callback);
			},
			function(fields, files, callback) {
				if (files.stream) {
					model.addFile({
						authorId: req.session.user.id,
						filename: path.basename(files.stream.path),
						content: fields.content,
						tags: fields.tags
					}, callback);
				} else {
					async.each(files, function(file, callback) {
						fs.unlink(file.path, callback);
					}, function(error) {
						callback(new Error(messages.request_invalid));
					});
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
		const {query, type, after} = req.query;

		model.searchFile(type, query, after, function(error, files) {
			res.jsonAuto({
				error: error,
				files: files
			});
		});
	});

	express.get(`${config.url}/file/:id`, function(req, res) {
		model.getFile(req.params.id, function(error, file) {
			res.jsonAuto({
				error: error,
				file: file
			});
		});
	});

	express.get(`${config.url}/file/:id/stream`, function(req, res) {
		async.waterfall([
			function(callback) {
				model.getFile(req.params.id, callback);
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

	express.put(`${config.url}/file/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				const form = new formidable.IncomingForm();

				form.uploadDir = uploadDirPath;
				form.keepExtensions = true;

				form.parse(req, callback);
			},
			function(fields, files, callback) {
				if (files.stream) {
					model.updateFile({
						authorId: req.session.user.id,
						filename: path.basename(files.stream.path),
						content: fields.content,
						tags: fields.tags
					}, callback);
				} else {
					async.each(files, function(file, callback) {
						fs.unlink(file.path, callback);
					}, function(error) {
						callback(new Error(messages.request_invalid));
					});
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

		model.archiveFile(req.params.id, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};