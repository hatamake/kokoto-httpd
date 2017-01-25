# REST API Reference

## /session

### PUT /session

Processes sign-in with provided user information.

#### Request

   Key      | Default | Description  
  ----------|---------|--------------
   username |         | The username 
   password |         | The password 

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   user     | [UserObject](object.md#userobject) of the current session

### DELETE /session

Removes current session and sign out.

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)

## /user

### POST /user

Creates new user, and process sign-in with the new user.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   username |         | The new username
   password |         | The new password

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   user     | [UserObject](object.md#userobject) of newly signed up user.

### GET /user/:id

Fetches the [UserObject](object.md#userobject) whose `user.id` is requested.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | Specify `user.id`, or *me* to fetch current user.

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   user     | [UserObject](object.md#userobject)

### GET /user/:id/picture

Fetches the profile picture of the specified user.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | Specify `user.id`, or *me* to fetch current user's picture.

#### Response

   A `image/png ` file stream.

### PUT /user/me

Updates user information of currently signed in user.

#### Request

   Key        | Default | Description
  ------------|---------|--------------
   [username] |         | The new username. Keep existing username, if omitted.
   [password] |         | The new password. Keep existing password, if omitted.
   [picture]  |         | The new profile picture. Keep existing picture, if omitted.

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   user     | [UserObject](object.md#userobject) of updated user.

### DELETE /user/me

Removes currently signed in user and destroys current session.

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)

## /document

### GET /document/:id

Fetches the [DocumentObject](object.md#documentobject) whose `document.id` is requested.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | Specify `document.id`.

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   document | [DocumentObject](object.md#documentobject)

### POST /document

Creates new document.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   title    |         | The title
   content  |         | The content in Kotodown
   tags     |         | The *array* of [TagObject](object.md#tagobject)s without `tag.id`

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   document | [DocumentObject](object.md#documentobject)

### PUT /document/:id

Updates specified document.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | The `document.id` of the document getting updated
   title    |         | The new title
   content  |         | The new content in Kotodown
   tags     |         | The new *array* of [TagObject](object.md#tagobject)s without `tag.id`

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   document | The [DocumentObject](object.md#documentobject) after update

### DELETE /document/:id

Set specified document as archived.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | The `document.id` of the document getting removed

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)

### GET /document/search

Fetch the list of the documents satisfying requested criteria.

#### Request

   Key      | Default  | Description
  ----------|----------|--------------
   [?type]  | `'date'` | The type of search criteria. Following types are available: `'date'`, `'history'`, `'tag'`, `'text'`
   [?query] |          | The value of `document.historyId`, `tag.id`, or plain text depending on the specified type
   [?after] | `-1`     | The `document.id` of the last document in the previous search result. Used for pagination.

#### Response

   Key       | Description
  -----------|-------------
   error     | [ErrorObject](object.md#errorobject)
   documents | The *array* of [DocumentObject](object.md#documentobject)s

## /tag

### PUT /tag/:id

Updates specified tag.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | The `tag.id` of the tag getting updated
   title    |         | The new title
   color    |         | The new color code

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   tag      | The [TagObject](object.md#tagobject) after update

### DELETE /tag/:id

Removes specified tag.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | The `tag.id` value of the tag getting removed

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)

### GET /tag/search

Fetches the list of the tags containing requested text in its title.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   [?query] |         | The target text searched from `tag.title`s
   [?after] | `-1`    | The `tag.id` of the last tag in the previous search result. Used for pagination.

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   tags     | The *array* of [TagObject](object.md#tagobject)s

## /comment

### POST /comment

Creates new comment.

#### Request

   Key        | Default | Description
  ------------|---------|--------------
   documentId |         | The `document.id` value of the document on which the new comment is added
   content    |         | The content of the new comment
   range      |         | The [RangeObject](object.md#rangeobject) specifying the position of the new comment in the document

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   comment  | [CommentObject](object.md#commentobject)

### PUT /comment/:id

Updates specified comment.

#### Request

   Key        | Default | Description
  ------------|---------|--------------
   :id        |         | The `comment.id` value of the comment getting updated
   content    |         | The new content

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)
   comment  | The [CommentObject](object.md#commentobject) after update

### DELETE /comment/:id

Removes specified comment.

#### Request

   Key      | Default | Description
  ----------|---------|--------------
   :id      |         | The `comment.id` value of the comment getting removed

#### Response

   Key      | Description
  ----------|-------------
   error    | [ErrorObject](object.md#errorobject)