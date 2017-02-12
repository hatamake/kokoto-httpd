module.exports = function(express, model, config) {
	express.put(`${config.url}/session`, function(req, res) {
		const {id, password} = req.body;

		model.user.auth(id, password, function(error, user) {
			if (!error) {
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
			res.jsonAuto({ error: error });
		});
	});
};