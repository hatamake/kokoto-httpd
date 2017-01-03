const _ = require('lodash');
const path = require('path');
const util = require('util');

const messages = require('../messages.json');

function routeApps(config, express, model) {
	config['apps'].forEach(function(app) {
		if (_.isString(app)) {
			const filepath = path.resolve(config.path, 'apps', app);
			app = require(filepath);
		}

		app(config, express, model);
	});

	console.log(util.format(messages.server_ready, config.service));
};

module.exports = routeApps;