const _ = require('lodash');
const Promise = require('bluebird');
const Redis = require('redis');

const {HttpError} = require('../../server/error');

function init(config) {
	let redis = (function(cacheConfig) {
		if (cacheConfig) {
			if (_.isArray(cacheConfig)) {
				return Redis.createClient.apply(redis, cacheConfig);
			} else {
				return Redis.createClient(cacheConfig);
			}
		} else {
			return null;
		}
	})(config.database.cache);
	
	return Promise.resolve([
		'document',
		'file',
		'tag'
	].reduce(function(model, moduleName) {
		const {createModel} = require(`./${moduleName}`);
		const modelDefinitions = createModel(redis, model);

		if (redis === null) {
			_.forOwn(modelDefinitions, function(value, key) {
				modelDefinitions[key] = nullConfigFallback;
			});
		}

		Object.assign(model, modelDefinitions);
		return model;
	}, {
		_redis: redis
	}));
}

function nullConfigFallback() {
	const lastArgument = _.last(arguments);

	if (_.isFunction(lastArgument)) {
		lastArgument(new HttpError('cache_not_configured', 500));
	}
}

exports.init = init;