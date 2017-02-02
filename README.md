# kokoto-httpd

RESTful API server for [Kokoto](https://github.com/hatamake/kokoto)

## Installation

This package is not published on NPM registry.
You have to manually clone and install the dependencies.

```bash
npm install git+https://github.com/hatamake/kokoto-httpd.git
```

## Usage

### Quick Example

```javascript
const KokotoHttpd = require('kokoto-httpd');

const server = new KokotoHttpd({
	url: '/api',
	secret: 'OPF:sM{R9AQTZ051v5odT3X`%h+hRe',
	database: {
		persist: 'mysql://127.0.0.1:3306/db-name',
		cache: 'redis://127.0.0.1:6379/0'
	}
});

server.listen(8000);
```

### REST API Reference

See [REST API Reference](/docs/rest.md).

### Class: KokotoHttpd

#### new KokotoHttpd([options])

Instantiate API server with following options.

 Key                        | Default                           | Description
----------------------------|-----------------------------------|-------------
 [options.path]             | The path to the package root      | A path to working directory where `static/` exists
 [options.url]              | `''`                              | A url prefix of the built-in apps *without* trailing slashes
 [options.secret]           | A random string of 44 chars       | A key phrase for encrypting sessions
 [options.session]          | `'session'`                       | A cookie field name for storing session ID
 [options.database.persist] | `'mysql://127.0.0.1:3306/kokoto'` | A full database URI *or* an array of arguments passed to the [Sequelize constructor](http://sequelize.readthedocs.io/en/latest/api/sequelize/#class-sequelize)
 [options.database.cache]   | `null`                            | The URL of the Redis server *or* an array of arguments passed to [`redis.createServer()`](https://github.com/NodeRedis/node_redis#rediscreateclient). To disable the cache server, use `null`.
 [options.site.name]        | `'Kokoto'`                        | The name of the site
 [options.site.pagination]  | `20`                              | A count of items displayed in each page
 [options.plugins]          | `[]`                              | An array of [plugin module](/docs/plugin.md)s
 [options.debug]            | `false`                           | Whether the call stack is included in [ErrorObject](/docs/object.md#errorobject)

#### Properties

This class extends [Node.js http.Server](https://nodejs.org/api/http.html#http_class_http_server).
You can use every property `http.Server` implements ─ including `close` event, `server.listen()` or `server.close([callback])` etc..

## License

kokoto-httpd is licensed under the MIT License.
See [LICENSE](/LICENSE) and [NOTICE](/NOTICE) for full license text.

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