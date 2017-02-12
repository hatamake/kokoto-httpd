const _ = require('lodash');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const util = require('util');

const initModel = require('../model').init;
const messages = require('../static/messages.json');

const defaultConfig = {
	path: path.join(__dirname, '..'),
	url: '',
	secret: crypto.randomBytes(32).toString('base64'),
	session: 'session',
	plugins: [],
	database: {
		persist: {
			client: 'mysql2',
			connection: 'mysql://127.0.0.1:3306/Kokoto'
		},
		cache: null,
		schemaPostfix: ''
	},
	site: {
		name: 'Kokoto',
		pagination: 20
	},
	debug: false
};

const middlewares = ['body', 'error', 'session', 'route'];

class KokotoHttpd extends http.Server {
	constructor(config) {
		const _express = express();
		super(_express);

		this.express = _express;
		this.config = _.merge(defaultConfig, config);
		this.model = null;

		initModel(this.config).asCallback((error, model) => {
			if (error) {
				throw error;
			}

			this.model = model;

			middlewares.forEach((name) => {
				const middleware = require(`./${name}.js`);
				middleware(this.express, this.model, this.config);
			});

			console.log(util.format(messages.server_ready, 'kokoto-httpd'));
		});
	}
}

module.exports = KokotoHttpd;