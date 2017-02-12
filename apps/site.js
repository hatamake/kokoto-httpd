const {HttpError} = require('../server/error');

module.exports = function(express, model, config) {
	express.get(`${config.url}/site/:key`, function(req, res) {
		if (res.shouldSignin()) { return; }

		const {key} = req.params;
		let error = null;
		let result = null;

		if (config.site.hasOwnProperty(key)) {
			result = config.site[key];
		} else {
			error = new HttpError('site_key_not_exist', 404);
		}

		res.jsonAuto({
			error: error,
			result: result
		});
	});
};