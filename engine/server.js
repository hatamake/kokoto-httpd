const extend = require('deep-extend');
const path = require('path');
const crypto = require('crypto');

module.exports = function(_config) {
	const config = extend({
		service: 'timekit-httpd',
		path: path.resolve(__dirname, '..'),
		secret: crypto.randomBytes(32).toString('base64'),
		db: 'mongodb://127.0.0.1/timekit',
		session: 'session',
		static: false,
		apps: []
	}, _config);

	// HTTP Server 설정
	const express = require('express')();
	const server = require('http').createServer(express);
	const io = require('socket.io')(server);

	// MongoDB Client 설정
	const mongoose = require('mongoose');
	mongoose.connect(config.db);

	// Static Middleware 로드
	if (config.static) {
		const createStaticMid = require('express').static;
		express.use("/static", createStaticMid(path.resolve(config.path, 'views', 'static')));
	}

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

		io.use(function(socket, next) {
			sessionMid(socket.request, socket.request.res, next);
		});
	}

	// Pug Template Engine Middleware 로드
	express.set('view engine', 'pug');
	express.set('views', path.resolve(config.path, 'views', 'templates'));
	
	express.locals.moment = require('moment');

	const createCsrfMid = require('csurf');
	express.use(createCsrfMid());
	express.use(function(req, res, next){
		res.locals['_csrf'] = req.csrfToken();
		next();
	});

	// Error Middleware 로드
	express.use(require('./error.js'));

	// Database Model 로드
	const Model = require('../model.js');
	const model = new Model(config, mongoose);

	// App. Routing 설정
	require('./route.js')(config, express, io, model);

	return server;
};