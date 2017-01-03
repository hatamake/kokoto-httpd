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
	- options.path: A path to working directory where `apps/`, `static/` and `model.js` exists. (Default: The path to the package root)
	- options.secret: A secret key phrase for encrypting sessions. (Default: A random 44-length string)
	- options.db: [MongoDB connection URI](https://docs.mongodb.com/manual/reference/connection-string/) used for connecting to the database. (Default: `'mongodb://127.0.0.1/kokoto'`)
	- options.session: A cookie field name for storing session ID. (Default: `'session'`)
	- options.pagination: A count of items that will be displayed in one page. (Default: `20`)

#### Returns

This function returns [Node.js http.Server](https://nodejs.org/api/http.html#http_class_http_server) instance. Refer to the official documentation.

### Using instance

Refer to [API Reference](/docs/api.md) documentation.

## Quick Example

```javascript
const KokotoHttpd = require('kokoto-httpd');

const server = KokotoHttpd({
	secret: "Secret Key Phrase",
	db: 'mongodb://username:password@serverAddress/dbName',
});

server.listen(8000);
```