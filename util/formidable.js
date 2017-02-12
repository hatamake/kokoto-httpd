const formidable = require('formidable');

const {HttpError} = require('../server/error');

function parseIncomingForm(req, uploadDirPath, callback) {
	const type = req.get('Content-Type');

	if (!type) {
		callback(new HttpError('request_invalid', 401));
	} else if (type.startsWith('multipart/form-data')) {
		const form = new formidable.IncomingForm();

		form.uploadDir = uploadDirPath;
		form.keepExtensions = true;

		form.parse(req, callback);
	} else if (type.startsWith('application/x-www-form-urlencoded')) {
		callback(null, req.body, {});
	} else {
		callback(null, {}, {});
	}
}

exports.parseIncomingForm = parseIncomingForm;