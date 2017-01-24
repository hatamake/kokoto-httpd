const _ = require('lodash');

module.exports = function(express, io, model, config) {
	express.use(function(req, res, next) {
		res.jsonAuto = function(data) {
			if (_.isError(data.error)) {
				data.error = {
					name: data.error.name,
					message: data.error.message,
					stack: (config.debug ? data.error.stack : null),
					status: data.error.status
				};

				res.status((data.error.status || 500));
			}

			res.json(data);
		};

		next();
	});
};