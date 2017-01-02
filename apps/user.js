const async = require('async');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const Jimp = require("jimp");

const messages = require('../messages.json')
const uploadDirPath = path.resolve(__dirname, '..', 'static', 'user');
const defaultPicturePath = path.resolve(uploadDirPath, 'default.png');

module.exports = function(config, express, model) {
	express.use(function(req, res, next) {
		res.shouldSignin = function() {
			if (req.user === null) {
				res.jsonAuto({ error: new Error(messages.login_required) });
				return true;
			} else {
				return false;
			}
		};

		(function(callback) {
			if (!req.session.userId) {
				callback(null);
				return;
			}

			model.getUser(req.session.userId, true, function(error, user) {
				if (!user) {
					callback(null);
					return;
				}

				delete user.password;

				callback(user);
			});
		})(function(user) {
			req.user = user;
			next();
		});
	});

	express.get('/user/status', function(req, res) {
		if (!res.shouldSignin()) {
			res.jsonAuto({ user: req.user });
		}
	});

	express.get('/user/picture/:id', function(req, res) {
		async.waterfall([
			function(callback) {
				res.sendFile(path.resolve(uploadDirPath, `${req.params.id}.png`), function(error) {
					callback(null, !!error);
				});
			},
			function(caught, callback) {
				if (caught) {
					res.sendFile(defaultPicturePath, callback);
				} else {
					callback(null);
				}
			}
		], function(error) {
			if (error) {
				res.status(error.status).end();
			}
		});
	});

	express.post('/user/signin', function(req, res) {
		const {username, password} = req.body;

		model.authUser(username, password, function(error, user) {
			if (user) {
				req.session.userId = user._id;
			}

			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.get('/user/signout', function(req, res) {
		if (res.shouldSignin()) { return; }

		req.session.destroy(function(error) {
			res.jsonAuto({ error: error })
		});
	});

	express.post('/user/signup', function(req, res) {
		const {username, password} = req.body;

		async.series([
			function(callback) {
				if (!password) {
					callback(new Error(messages.password_required));
				} else {
					callback(null);
				}
			},
			function(callback) {
				model.addUser({
					username: username,
					password: password
				}, callback);
			}
		], function(error, user) {
			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.post('/user/update', function(req, res) {
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
				const newPath = path.resolve(uploadDirPath, `${req.user._id}.png`);

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
			function(fields, callback) {
				const user = {};
				const {username, password} = fields;

				if (username) {
					user.username = username;
				}

				if (password) {
					user.password = password;
				}

				callback(null, user);
			},
			function(user, callback) {
				model.updateUser(req.user._id, user, callback);
			}
		], function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.get('/user/remove', function(req, res) {
		if (res.shouldSignin()) { return; }

		async.parallel([
			function(callback) {
				model.removeUser(req.user._id, callback);
			},
			function(callback) {
				req.session.destroy(callback);
			}
		], function(error) {
			res.jsonAuto({ error: error });
		});
	});
};