const async = require('async');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const Jimp = require("jimp");

const messages = require('../static/messages.json');

module.exports = function(express, model, config) {
	const uploadDirPath = path.join(config.path, 'static', 'user');
	const defaultPicturePath = path.join(uploadDirPath, 'default.png');

	express.post(`${config.url}/user`, function(req, res) {
		const {id, password, name} = req.body;

		model.addUser({
			id: id,
			password: password,
			name: name
		}, function(error, user) {
			if (!error) {
				req.session.user = user;
			}

			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.get(`${config.url}/user/:id`, function(req, res) {
		let id = req.params.id;

		(function(callback) {
			if (id === 'me') {
				if (res.shouldSignin()) {
					callback(null, null, true);
				} else {
					callback(null, req.session.user, false);
				}
			} else {
				model.getUser(id, callback);
			}
		})(function(error, user, sent) {
			if (!sent) {
				res.jsonAuto({
					error: error,
					user: user
				});
			}
		});
	});

	express.get(`${config.url}/user/:id/picture`, function(req, res) {
		let id = req.params.id;

		if (id === 'me') {
			if (res.shouldSignin()) {
				return;
			}

			id = req.session.user.id;
		}

		async.waterfall([
			function(callback) {
				if (id) {
					res.sendFile(path.join(uploadDirPath, `${id}.png`), function(error) {
						callback(null, !!error);
					});
				} else {
					callback(null, true);
				}
			},
			function(useDefault, callback) {
				if (useDefault) {
					res.sendFile(defaultPicturePath, callback);
				} else {
					callback(null);
				}
			}
		], function(error) {
			if (error) {
				res.jsonAuto({ error: error });
			}
		});
	});

	express.put(`${config.url}/user/me`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.waterfall([
			function(callback) {
				const type = req.get('Content-Type');

				if (!type) {
					callback(new Error(messages.request_invalid));
				} else if (type.startsWith('multipart/form-data')) {
					const form = new formidable.IncomingForm();

					form.uploadDir = uploadDirPath;
					form.keepExtensions = true;
					form.maxFieldsSize = 2 * 1024 * 1024;

					form.parse(req, callback);
				} else if (type.startsWith('application/x-www-form-urlencoded')) {
					callback(null, req.body, {});
				} else {
					callback(null, {}, {});
				}
			},
			function(fields, files, callback) {
				if (!files.picture) {
					callback(null, fields);
					return;
				}

				const oldPath = files.picture.path;
				const newPath = path.join(uploadDirPath, `${req.session.user.id}.png`);

				async.waterfall([
					function(callback) {
						Jimp.read(oldPath, callback)
					},
					function(jimp, callback) {
						jimp.resize(40, 40).write(newPath, callback);
					},
					function(_, callback) {
						fs.unlink(oldPath, callback);
					},
					function(callback) {
						callback(null, fields);
					}
				], callback);
			},
			function(user, callback) {
				model.updateUser(req.session.user.id, user, callback);
			}
		], function(error, user) {
			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.delete(`${config.url}/user/me`, function(req, res) {
		if (res.shouldSignin()) { return; }

		async.parallel([
			function(callback) {
				model.removeUser(req.session.user.id, callback);
			},
			function(callback) {
				req.session.destroy(callback);
			}
		], function(error) {
			res.jsonAuto({ error: error });
		});
	});
};