module.exports = function(express, model, config) {
	express.put(`${config.url}/session`, function(req, res) {
		const {username, password} = req.body;

		model.authUser(username, password, function(error, user) {
			if (!error && user) {
				req.session.user = user;
			}

			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.delete(`${config.url}/session`, function(req, res) {
		if (res.shouldSignin()) { return; }

		req.session.destroy(function(error) {
			res.jsonAuto({ error: error })
		});
	});
};