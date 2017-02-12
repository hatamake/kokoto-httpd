const _ = require('lodash');

const messages = require('../static/messages.json');

function middleware(express, model, config) {
	express.use(function (req, res, next) {
		res.jsonAuto = function (data) {
			let status = 200;
			let json = data;

			if (_.isError(data.error)) {
				status = (isNaN(data.error.status) ? 500 : data.error.status);

				json.error = {
					name: data.error.name,
					message: data.error.message,
					stack: (config.debug ? data.error.stack : null)
				};
			}

			res.status(status);
			res.json(data);
		};

		next();
	});
}

class HttpError extends Error {
	constructor(messageId, status) {
		super(messages[messageId] || messageId);
		this.name = 'HttpError';

		this.status = status;
	}
}

module.exports = middleware;
module.exports.HttpError = HttpError;