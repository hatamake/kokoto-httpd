var Engine = require('./engine/');

var engine = new Engine({
	service: 'kokoto-httpd',
	secret: "71_q_eZj'L00|D*])9|To+1_(-oCuc",
	db: 'mongodb://kotostudio:zhxhtmxbeldh@ds145138.mlab.com:45138/kokoto',
	static: true,
	apps: [
		'user',
		'document'
	]
});

engine.listen(8000);