const path = require('path');

function requireApp(basePath, filename, quiet) {
	try {
		const filepath = path.resolve(basePath, 'apps', filename);
		return require(filepath);
	} catch(error) {
		if (quiet && error.code === "MODULE_NOT_FOUND") {
			return null;
		} else {
			throw error;
		}
	}
}

function routeApps(config, express, io, model) {
	config['apps'].forEach(function(id) {
		let app = null;
		let socket = null;

		if ((app = requireApp(config.path, id + '.js', false)) !== null) {
			app(config, express, model);
		}

		if ((socket = requireApp(config.path, id + '.socket.js', true)) !== null) {
			socket(config, io, model);
		}
	});

	console.log(config.service + ' 준비 완료');
};

module.exports = routeApps;