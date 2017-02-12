const async = require('async');
const Promise = require('bluebird');

const initPersistModel = require('./persist').init;
const initCacheModel = require('./cache').init;

const {HttpError} = require('../server/error');

function init(config) {
	return Promise.all([
		initPersistModel(config),
		initCacheModel(config)
	]).spread(function(persistModel, cacheModel) {
		return {
			_knex: persistModel._knex,
			_redis: cacheModel._redis
		};
	});
}

exports.init = init;