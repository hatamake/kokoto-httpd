# kokoto-httpd

Backend pseudo-RESTful API server for [Kokoto](https://github.com/hatamake/kokoto)

## Installation

This package is not published on NPM registry. You have to manually clone and install the dependencies.

```bash
npm install git+https://github.com/hatamake/kokoto-httpd.git
```

## Usage

### Quick Example

```javascript
const KokotoHttpd = require('kokoto-httpd');

const server = KokotoHttpd({
	url: '/api',
	secret: 'Secret Key Phrase',
	database: {
		persist: 'mysql://127.0.0.1:3306/db-name',
		cache: 'redis://127.0.0.1:6379/0'
	}
});

server.listen(8000);
```

### Instantiate: `new KokotoHttpd(options)`

* options: Options for running server.
	- options.path:
	  A path to working directory where `static/` exists
	  (Default: The path to the package root)

	- options.url:
	  A url prefix of the built-in apps without trailing slash
	  (Default: `''`)

	- options.secret:
	  A secret key phrase for encrypting sessions
	  (Default: A 44-length random [String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

	- options.database.persist:
	  A full database URI or an array of arguments passed to the [Sequelize constructor](http://sequelize.readthedocs.io/en/latest/api/sequelize/#class-sequelize)
	  (Default: `[]`)

	- options.database.cache:
	  The URL of the Redis server or an array of arguments passed to [`redis.createServer()`](https://github.com/NodeRedis/node_redis#rediscreateclient)
	  (Default: `[]`)

	- options.session:
	  A cookie field name for storing session ID
	  (Default: `'session'`)

	- options.plugins:
	  An array of [plugin module](/docs/plugin.md)s.
	  (Default: `[]`)

	- options.pagination:
	  A count of items displayed in each page
	  (Default: `20`)

### Properties

This main class, the entry point to `kokoto-httpd` inherits [Node.js http.Server](https://nodejs.org/api/http.html#http_class_http_server).
You can use every property `http.Server` implements, which includes `server.listen()`, `server.close()`, `connect` event, etc.

### REST API Reference

See [API Reference](/docs/api.md).

## License

Kokoto is licensed under the MIT License. See [LICENSE](/LICENSE) and [NOTICE](/NOTICE) for full license text.

```
MIT License

Copyright (c) 2017 cumul <gg6123@naver.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```