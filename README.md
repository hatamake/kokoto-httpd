# kokoto-httpd

Backend pseudo-RESTful API server for [Kokoto](https://github.com/hatamake/kokoto).

## Installation

This package is not published on NPM registry. You have to manually clone and install the dependencies.

```bash
$ git clone https://github.com/hatamake/kokoto-httpd.git
$ cd kokoto-httpd
$ npm install
```

## Usage

### Creating instance: KokotoHttpd(options)

#### Arguments

* options: Detailed options for running server.
	- options.service: A service name displayed on console.
	- options.path: A path to working directory where `apps/`, `static/` and `model.js` exists. (Default: The path to the package root)
	- options.url: A url prefix of the built-in apps without trailing slash. (Default: `''`)
	- options.secret: A secret key phrase for encrypting sessions. (Default: A random 44-length [String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))
	- options.db: [MongoDB connection URI](https://docs.mongodb.com/manual/reference/connection-string/) used for connecting to the database. (Default: `'mongodb://127.0.0.1/kokoto'`)
	- options.session: A cookie field name for storing session ID. (Default: `'session'`)
	- options.apps: An array of filename in `apps/` or app module itself. Items in this option are appended to the default value.
	- options.pagination: A count of items that will be displayed in one page. (Default: `20`)

#### Returns

This function returns [Node.js http.Server](https://nodejs.org/api/http.html#http_class_http_server) instance. Refer to the official documentation.

### Using instance

Refer to [API Reference](/docs/api.md) documentation.

## Quick Example

```javascript
const KokotoHttpd = require('kokoto-httpd');

const server = KokotoHttpd({
	url: "/api",
	secret: "Secret Key Phrase",
	db: 'mongodb://username:password@serverAddress/dbName',
});

server.listen(8000);
```