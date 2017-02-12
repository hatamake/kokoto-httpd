const Promise = require('bluebird');

const Parser = require('koto-parser');
const InlineParser = require('koto-parser/lib/core/inline');

const {BaseBlock} = require('koto-parser/lib/blocks/base');

const {CodeToken} = require('koto-parser/lib/tokens/code');
const {BoldToken} = require('koto-parser/lib/tokens/bold');
const {ItalicToken} = require('koto-parser/lib/tokens/italic');
const {UnderlineToken} = require('koto-parser/lib/tokens/underline');
const {StrikeToken} = require('koto-parser/lib/tokens/strike');
const {LinkToken} = require('koto-parser/lib/tokens/link');
const {BaseToken} = require('koto-parser/lib/tokens/base');

const defaultTokenTypes = require('koto-parser/lib/tokens');

function render(content, model, callback) {
	Parser.render(content, {
		tokenTypes: defaultTokenTypes.concat([FileToken]),
		model: model
	}, callback);
}

function renderInline(content, model, callback) {
	Parser.render(content, {
		blockTypes: [CommentBlock],
		tokenTypes: [CodeToken, BoldToken, ItalicToken, UnderlineToken, StrikeToken, LinkToken],
		model: model
	}, callback);
}

class CommentBlock extends BaseBlock {

	constructor(contentTokens) {
		super();

		this.tokens = contentTokens;
	}

	static match(scanner) {
		return true;
	}

	static parse(scanner, match, options) {
		scanner.mark();
		scanner.position = scanner.length;
		const content = scanner.pop();
		const contentTokens = InlineParser.parse(content, options);

		return new CommentBlock(contentTokens);
	}

	render(options, callback) {
		InlineParser.render(this.contentTokens, options, callback);
	}
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
			callback(null, `<div>${file.title}</div>`);
		}).catch(function(error) {
			callback(null, `<div>${error.message}</div>`);
		});
	}
}

exports.render = render;
exports.renderPromise = Promise.promisify(render);
exports.renderInline = renderInline;
exports.renderInlinePromise = Promise.promisify(renderInline);