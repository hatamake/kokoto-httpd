const session = require('express-session');

const {HttpError} = require('./error');

module.exports = function(express, model, config) {
	const options = (function(cacheConfig) {
		const result = {
			secret: config.secret,
			name: config.session.name,
			resave: false,
			saveUninitialized: false
		};

		if (cacheConfig) {
			const RedisStore = require('connect-redis')(session);
			result.store = new RedisStore({ client: model._redis });
		}

		return result;
	})(config.database.cache);

	express.use(session(options));

	express.use(function(req, res, next) {
		res.shouldSignin = function() {
			if (!req.session || !req.session.user) {
				res.jsonAuto({
					error: new HttpError('login_required', 403)
				});

				return true;
			} else {
				return false;
			}
		};

		next();
	});
};