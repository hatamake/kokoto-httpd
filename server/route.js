const path = require('path');
const fs = require('fs');

const appDirPath = path.join(__dirname, '..', 'apps');

module.exports = function(express, io, model, config) {
	fs.readdirSync(appDirPath).forEach(function(filename) {
		const app = require(path.join(appDirPath, filename));
		app(express, io, model, config);
	});

	config.plugins.forEach(function(app) {
		app(express, io, model, config);
	});
};