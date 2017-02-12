const async = require('async');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const {parseIncomingForm} = require('../util/formidable');

module.exports = function(express, model, config) {
	const uploadDirPath = path.join(config.path, 'static', 'user');
	const defaultPicturePath = path.join(uploadDirPath, 'default.png');

	express.post(`${config.url}/user`, function(req, res) {
		const {id, password, name} = req.body;

		model.user.create(id, password, name, function(error, user) {
			if (!error && user) {
				req.session.user = user;
			}

			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.get(`${config.url}/user/:id`, function(req, res) {
		if (res.shouldSignin()) { return; }

		(function(id, callback) {
			if (id === 'me') {
				callback(null, req.session.user);
			} else {
				model.user.get(id, callback);
			}
		})(req.params.id, function(error, user) {
			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.get(`${config.url}/user/:id/picture`, function(req, res) {
		if (res.shouldSignin()) { return; }

		let {id} = req.params;

		if (id === 'me') {
			id = req.session.user.id;
		} else {
			try {
				id = model.user._validateId(id);
			} catch(error) {
				res.jsonAuto({ error: error });
				return;
			}
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

		const {id} = req.session.user;
		const picturePath = path.join(uploadDirPath, `${id}.png`);

		async.waterfall([
			function(callback) {
				parseIncomingForm(req, uploadDirPath, callback);
			},
			function(fields, files, callback) {
				if (!files.picture) {
					callback(null, fields);
					return;
				}

				const tmpPicturePath = files.picture.path;

				async.waterfall([
					function(callback) {
						Jimp.read(tmpPicturePath, callback);
					},
					function(jimp, callback) {
						jimp.resize(40, 40).write(picturePath, callback);
					},
					function(_, callback) {
						fs.unlink(tmpPicturePath, callback);
					},
					function(callback) {
						callback(null, fields);
					}
				], callback);
			},
			function(user, callback) {
				model.user.update(id, user, callback);
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