const path = require('path');
const fs = require('fs');

const appDirPath = path.join(__dirname, '..', 'apps');

module.exports = function(express, model, config) {
	fs.readdirSync(appDirPath).forEach(function(filename) {
		const app = require(path.join(appDirPath, filename));
		app(express, model, config);
	});

	config.plugins.forEach(function(app) {
		app(express, model, config);
	});
};