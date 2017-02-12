const Promise = require('bluebird');
const Knex = require('knex');

function init(config) {
	const knex = Knex(config.database.persist);

	const {schemaPostfix} = config.database;
	const schemaNames = {};

	return Promise.reduce([
		'users',
		'articles',
		'comments',
		'tags',
		'documents',
		'files'
	], function(model, moduleName) {
		const {createSchema, createModel} = require(`./${moduleName}`);

		const schemaDefinitions = createSchema(knex, schemaNames);
		const modelDefinitions = createModel(knex, schemaNames, model);

		return Promise.each(schemaDefinitions, function({name, define}) {
			if (schemaPostfix) {
				const schemaName = name + '__' + schemaPostfix;

				schemaNames[name] = schemaName;
				name = schemaName;
			} else {
				schemaNames[name] = name;
			}

			return knex.schema.hasTable(name).then(function(exist) {
				if (!exist) {
					return knex.schema.createTable(name, define);
				}
			});
		}).then(function() {
			Object.assign(model, modelDefinitions);
			return model;
		});
	}, {
		_knex: knex
	});
}

exports.init = init;