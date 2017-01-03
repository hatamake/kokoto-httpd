const _ = require('lodash');
const path = require('path');

function KokotoHttpd(config) {
	config = (function(config) {
		const apps = (config.apps || []);
		delete config.apps;

		return _.merge({
			service: 'kokoto-httpd',
			path: path.resolve(__dirname, '..'),
			url: '',
			secret: require('crypto').randomBytes(32).toString('base64'),
			db: 'mongodb://127.0.0.1/kokoto',
			session: 'session',
			apps: [
				'user',
				'document',
				'tag'
			].concat(apps),
			pagination: 20
		}, config);
	})(config);

	// HTTP Server 설정
	const express = require('express')();
	const server = require('http').createServer(express);

	// MongoDB Client 설정
	const mongoose = require('mongoose');
	mongoose.connect(config.db);
	mongoose.Promise = Promise;

	// HTTP Body Parser Middleware 로드
	const createBodyParserMid = require('body-parser');
	express.use(createBodyParserMid.urlencoded({ extended: true }));
	express.use(createBodyParserMid.json());

	// Session Middleware
	if (config.session) {
		// 설정
		const createSessionMid = require('express-session');

		const SessionStorage = require('connect-mongo')(createSessionMid);
		const sessionStorage = new SessionStorage({
			mongooseConnection: mongoose.connection
		});

		const sessionMid = createSessionMid({
			store: sessionStorage,
			secret: config.secret,
			name: config.session.name,
			key: config.session.name,
			resave: false,
			saveUninitialized: false
		});

		// 로드
		express.use(sessionMid);
	}

	// Error Middleware 로드
	express.use(function(req, res, next) {
		res.jsonAuto = function(json) {
			if (require('lodash').isError(json.error)) {
				json.error = {
					name: json.error.name,
					message: json.error.message
				};
			}
			
			res.json(json);
		};

		next();
	});

	// Database Model 로드
	const Model = require(path.resolve(config.path, 'model.js'));
	const model = new Model(config, mongoose);

	// App. Routing 설정
	require('./route.js')(config, express, model);

	return server;
};

module.exports = KokotoHttpd;