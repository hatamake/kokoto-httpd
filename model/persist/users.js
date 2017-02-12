function createSchema() {
	return [{
		name: 'Users',
		define(table) {
			table.string('id', 20).primary();
			table.string('password', 40).notNullable();
			table.string('name', 20).notNullable();
		}
	}];
}

function createModel(knex, schemaNames, model) {
	return {};
}

exports.createSchema = createSchema;
exports.createModel = createModel;