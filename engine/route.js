function loadApp(filename) {
	try {
		return require('../apps/' + filename);
	} catch(error) {
		if (error.code === "MODULE_NOT_FOUND") {
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

		if ((app = loadApp(id + '.js')) !== null) {
			app(config, express, model);
		}

		if ((socket = loadApp(id + '.socket.js')) !== null) {
			socket(config, io, model);
		}
	});

	express.get('*', function(req, res) {
		res.autoRender('404', {}, 404);;
	});

	console.log(config.service + ' 준비 완료');
};

module.exports = routeApps;