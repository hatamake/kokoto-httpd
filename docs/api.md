# /user

사용자 추가, 제거, 변경과 세션 관리 등이 관련된 API

## GET /user/status

현재 세션에 로그인된 사용자의 정보를 조회합니다. 로그인 상태에서만 사용할 수 있습니다.

* 응답
 - user: `user.password`가 제거된 [UserObject](object.md#userobject)

## GET /user/picture/:id

사용자가 설정한 프로필 사진을 조회합니다. 설정된 사진이 없는 경우 `/static/user/default.png`로 응답합니다.

* 요청
 - id (URL): 조회하려는 프로필 사진을 설정한 사용자의 ID

## POST /user/signin

요청된 사용자 정보로 로그인합니다.

* 요청
 - username: 사용자 이름
 - password: 비밀번호

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 로그인된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - user: `user.password`가 제거된 [UserObject](object.md#userobject)

## GET /user/signout

현재 세션을 삭제합니다. 로그인 상태에서만 사용할 수 있습니다.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## POST /user/signup

새로운 사용자를 추가합니다.

* 요청
 - username: 가입할 사용자의 사용자 이름
 - password: 가입할 사용자의 비밀번호

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 가입된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - user: `user.password`가 제거된 [UserObject](object.md#userobject)

## POST /user/update

현재 로그인된 사용자의 정보를 변경합니다. 로그인 상태에서만 사용할 수 있습니다.

* 요청
 - username: 새 사용자 이름. 요청에 포함되지 않은 경우에는 변경되지 않음.
 - password: 새 비밀번호. 요청에 포함되지 않은 경우에는 변경되지 않음.
 - picture: 새 사용자 프로필 사진. 요청에 포함되지 않은 경우에는 변경되지 않음. 

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 변경된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## GET /user/remove

현재 로그인된 사용자와 세션을 삭제합니다.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

# /document

문서의 생성, 변경, 삭제, 검색 등과 관련된 API

## GET /document/get/:documentId

문서를 조회합니다.

* 요청
 - documentId (URL): 조회할 문서의 ID

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 조회된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - document: [DocumentObject](object.md#documentobject). 오류가 발생한 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## GET /document/history/:indexId

문서의 변경 이력을 조회합니다.

* 요청
 - indexId (URL): 조회할 문서 색인의 ID

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 조회된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - history: 변경 순서에 따라 정렬된 문서 ID의 [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array). 오류가 발생한 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).


## POST /document/add

새로운 문서와 문서 색인을 생성합니다. 로그인 상태에서만 사용할 수 있습니다.

* 요청
 - title: 생성할 문서의 제목
 - markdown: KFM(Kokoto flavored markdown)으로 작성된, 생성할 문서의 내용.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 조회된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - index._id: 생성된 문서 색인의 ID

## POST /document/update/:indexId

기존의 문서를 편집하고 문서 색인에 추가합니다. 로그인 상태에서, 자신이 생성한 문서에 대해서만 사용할 수 있습니다.

* 요청
 - indexId (URL): 편집할 문서 색인의 ID
 - title: 새 문서의 이름
 - markdown: KFM(Kokoto flavored markdown)으로 작성된, 새 문서의 내용.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 조회된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## GET /document/remove/:indexId

기존의 문서를 보관하고 문서 색인에 기록합니다. 로그인 상태에서, 자신이 생성한 문서에 대해서만 사용할 수 있습니다.

* 요청
 - indexId (URL): 보관을 기록할 문서 색인의 ID

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## POST /document/search

요청된 조건에 해당하는 문서를 검색합니다.

* 요청
 - tag: 태그의 ID. 해당 태그가 포함된 문서만을 검색합니다.
 - after: 이전에 마지막으로 검색된 문서의 ID. 페이징을 위해 사용합니다. [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null)인 경우 검색 결과의 첫 페이지로 응답합니다.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - documents: [DocumentObject](object.md#documentobject)로 이루어진 [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array). 오류가 발생한 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

# /tag

태그의 조회, 생성, 변경 등과 관련된 API

## GET /tag/list

생성된 모든 태그의 정보를 조회합니다. 사용 빈도가 높은 태그 순으로 정렬합니다.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - tags: [TagObject](object.md#tagobject)로 이루어진 [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array). 오류가 발생한 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## POST /tag/paint/:id

요청된 태그의 색상을 변경합니다. 로그인 상태에서만 사용할 수 있습니다.

* 요청
 - id (URL): 색상을 변경할 태그의 ID
 - color: 새 색상의 HEX 색상코드 (예를 들어, #333333)

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

# /comment

댓글의 작성, 수정, 삭제 등과 관련된 API

## POST /comment/add

새로운 댓글을 작성합니다. 로그인 상태에서만 사용할 수 있습니다.

* 요청
 - documentId: 새 댓글이 달리는 문서의 ID
 - content: 새 댓글의 내용
 - range: [RangeObject](object.md#rangeobject). 새 댓글이 문서에서 차지하는 위치 정보.

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - comment: [CommentObject](object.md#commentobject). 오류가 발생한 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## POST /comment/update/:id

기존의 댓글을 수정합니다. 로그인 상태에서, 자신이 생성한 댓글에 대해서만 사용할 수 있습니다.

* 요청
 - id (URL): 수정하고자 하는 댓글의 ID
 - content: 댓글의 새 내용

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).
 - comment: [CommentObject](object.md#commentobject). 오류가 발생한 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).

## GET /comment/remove/:id

기존의 댓글을 삭제합니다. 로그인 상태에서, 자신이 생성한 댓글에 대해서만 사용할 수 있습니다.

* 요청
 - id (URL): 삭제하고자 하는 댓글의 ID

* 응답
 - error: [ErrorObject](object.md#errorobject). 성공적으로 처리된 경우 [null](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/null).