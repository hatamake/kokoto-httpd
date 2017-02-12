function filterArchive(query) {
	query.whereNot('isArchived', true);
}

function paginate(query, lastId, count) {
	query.orderBy('id', 'DESC')
		.limit(count);

	if (lastId > 0) {
		query.where('id', '>', lastId);
	}
}

function searchByHistoryId(query, historyId, lastId, count) {
	query.where('historyId', historyId);
	paginate(query, lastId, count);
}

function searchByTagId(query, schemaNames, target, tagId, lastId, count) {
	query.innerJoin(schemaNames.tag_pivot, `${schemaNames[target]}.id`, `${schemaNames.tag_pivot}.documentId`)
		.innerJoin(schemaNames.tag, `${schemaNames.tag_pivot}.tagId`, `${schemaNames.tag}.id`)
		.groupBy(`${schemaNames[target]}.id`)
		.where(`${schemaNames.tag}.id`, tagId)
		.whereNot(`${schemaNames[target]}.isArchived`, true)
		.orderBy(`${schemaNames[target]}.id`, 'DESC')
		.limit(count);

	if (lastId > 0) {
		query.where(`${schemaNames[target]}.id`, '>', lastId);
	}
}

function searchByText(query, columns, text) {
	columns.forEach(function(column) {
		query.orWhere(column, 'like', `%${text}%`);
	});
}

exports.filterArchive = filterArchive;
exports.paginate = paginate;
exports.searchByHistoryId = searchByHistoryId;
exports.searchByTagId = searchByTagId;
exports.searchByText = searchByText;