function archive(table) {
	table.boolean('isArchived').notNullable().defaultTo(false);
	table.uuid('historyId').notNullable().index();
	table.integer('revision').notNullable().defaultTo(1);
}

function content(table) {
	table.string('authorId', 20);
	table.text('content');
	table.text('parsedContent');
}

exports.archive = archive;
exports.content = content;