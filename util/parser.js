const Promise = require('bluebird');
const Parser = require('koto-parser');
const {BaseToken} = require('koto-parser/lib/tokens/base');

const defaultTokenTypes = require('koto-parser/lib/tokens');

function render(content, model, callback) {
	Parser.render(content, {
		tokenTypes: defaultTokenTypes.concat([FileToken]),
		model: model
	}, callback);
}

function renderPromise(content, model) {
	return new Promise((resolve, reject) => {
		render(content, model, function(error, result) {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});
}

class FileToken extends BaseToken {

	constructor(id, description) {
		super();
		this.id = id;
		this.description = description;
	}

	static match(scanner) {
		scanner.mark();						// [start]

		if (!scanner.ahead('#')) {
			return null;
		}

		scanner.skip(+1);

		if (!scanner.ahead('[')) {
			scanner.popAndBack();			// []
			return null;
		}

		scanner.skip(+1);
		scanner.mark();						// [start, titleStart]

		if (!scanner.find(']')) {
			scanner.popAndBack();			// [start]
			scanner.popAndBack();			// []
			return null;
		}

		const description = scanner.pop(); 	// [start]
		scanner.skip(+1);

		if (!description || !scanner.ahead('(')) {
			scanner.popAndBack();			// []
			return null;
		}

		scanner.skip(+1);
		scanner.mark();						// [start, srcStart]

		if (!scanner.find(')')) {
			scanner.popAndBack();			// [start]
			scanner.popAndBack();			// []
			return null;
		}

		const id = scanner.pop();			// [start]
		scanner.skip(+1);

		if (!id) {
			scanner.popAndBack();			// []
			return null;
		}

		return { id: id, description: description };
	}

	static parse(scanner, match, options) {
		return new FileToken(match.id, match.description);
	}

	render(options, callback) {
		options.model.getFile(this.id, null).then(function(file) {
			return `<div>${file.title}</div>`;
		}).catch(function(error) {
			return `<div>${error.message}</div>`;
		});
	}
}

exports.render = render;
exports.renderPromise = renderPromise;