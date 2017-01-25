const session = require('express-session');
const messages = require('../static/messages.json');

module.exports = function(express, io, model, config) {
	const options = (function(cacheConfig) {
		const result = {
			secret: config.secret,
			name: config.session.name,
			resave: false,
			saveUninitialized: false
		};

		if (cacheConfig) {
			const RedisStore = require('connect-redis')(session);
			result.store = new RedisStore({ client: model.cache.client });
		}

		return result;
	})(config.database.cache)

	const middleware = session(options);

	express.use(middleware);
	express.use(function(req, res, next) {
		res.shouldSignin = function() {
			if (!req.session || !req.session.user) {
				const error = new Error(messages.login_required);
				error.status = 403;

				res.jsonAuto({ error: error });
				return true;
			}

			return false;
		};

		next();
	});

	io.use(function(socket, next) {
		middleware(socket.request, socket.request.res, next);
	});
};