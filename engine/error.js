const _ = require('lodash');

const errorMessages = {
	403: '요청을 처리할 수 있는 권한이 없습니다.',
	404: '요청된 데이터를 찾을 수 없습니다.',
	'default': '알 수 없는 오류가 발생했습니다.'
};

function createErrorContext(error) {
	if (_.isError(error)) {
		return {
			code: (error.statusCode || 500),
			msg: error.message
		}
	}

	const code = (_.isInteger(error) ? error : 500);
	const msg = (() => {
		if (errorMessages.hasOwnProperty(code)) {
			return errorMessages[code];
		} else {
			return errorMessages['default'];
		}
	})();

	return { code: code, msg: msg };
}

module.exports = function(req, res, next) {
	res.autoRender = function(template, context, error) {
		const isError = (error !== undefined && error !== null);

		if (!context) {
			context = {};
		}

		if (isError) {
			context.error = createErrorContext(error);
			res.status(context.error.code);
		} else {
			context.error = null;
		}

		res.render(template, context);
	};

	next();
};