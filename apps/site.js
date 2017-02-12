const messages = require('../static/messages.json');

module.exports = function(express, model, config) {
	express.get(`${config.url}/site/:key`, function(req, res) {
		const {key} = req.params;

		let error, result = null;

		if (config.site.hasOwnProperty(key)) {
			result = config.site[key];
		} else {
			error = new Error(messages.request_invalid);
		}

		res.jsonAuto({
			error: error,
			result: result
		});
	});
};