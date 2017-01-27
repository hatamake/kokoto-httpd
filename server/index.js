const _ = require('lodash');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const util = require('util');

const KokotoModel = require('../model');
const messages = require('../static/messages.json');

const defaultConfig = {
	path: path.join(__dirname, '..'),
	url: '',
	secret: crypto.randomBytes(32).toString('base64'),
	database: {
		persist: 'mysql://127.0.0.1:3306/kokoto',
		cache: null
	},
	session: 'session',
	plugins: [],
	pagination: 20,
	debug: false
};

const middlewares = ['body', 'session', 'error', 'route'];

class KokotoHttpd extends http.Server {
	constructor(config) {
		const _express = express();
		super(_express);

		this.express = _express;

		this.config = _.merge(defaultConfig, config);

		this.model = new KokotoModel(this.config);
		this.model.sync((error) => {
			if (error) {
				throw error;
			}

			middlewares.forEach((name) => {
				const middleware = require(`./${name}.js`);
				middleware(this.express, this.model, this.config);
			});

			console.log(util.format(messages.server_ready, 'kokoto-httpd'));
		});
	}
}

module.exports = KokotoHttpd;