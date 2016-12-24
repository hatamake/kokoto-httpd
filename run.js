var Engine = require('./engine/');

var engine = new Engine({
	service: 'kokoto-httpd',
	secret: "71_q_eZj'L00|D*])9|To+1_(-oCuc",
	db: 'mongodb://127.0.0.1/kokoto',
	static: true,
	apps: [
		'view'
	]
});

engine.listen(8000);