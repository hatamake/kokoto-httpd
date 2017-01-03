# UserObject

```javascript
{
  _id: ObjectID,     // 사용자 ID
  username: String,  // 사용자 이름. A-Z, a-z, 0-9, _로 이루어진 4-20자의 문자열.
  password: String   // 해시 처리 한 비밀번호
}
```

# DocumentObject

```javascript
{
  _id:       ObjectID,               // 문서 ID
  latest:    Boolean,                // 이후의 변경 이력이 없는지의 여부. 즉, 최신 상태 여부.
  author:    UserObject,             // 작성자 정보
  title:     String,                 // 문서 제목
  markdown:  String,                 // 작성자가 작성한 문서의 원본 KFM 내용
  html:      String,                 // HTML로 렌더링된 문서의 내용
  comments:  Array<CommentObject>,   // 해당 문서에 달린 코멘트 목록
  tags:      Array<TagObject>,       // 해당 문서에 달린 태그 목록
  createdAt: Date                    // 문서 생성 시각
}
```

# CommentObject

```javascript
{
  _id:       ObjectID,              // 코멘트 ID
  author:    UserObject,            // 작성자 정보
  content:   String,                // 코멘트 내용
  position:  Array<Number>,         // 코멘트가 표시될 문서 상의 위치. [시작 Index, 종료 Index] 형식.
  createdAt: Date                   // 코멘트 작성 시각
}
```

# TagObject

```javascript
{
  _id:   ObjectID,       // 태그 ID
  title: String,         // 태그 제목
  count: Number,         // 태그가 사용된 회수
  color: String          // 태그 색상. HEX 색상코드.
}
```

# ErrorObject

```javascript
{
  name:    String,       // 오류 이름
  message: String        // 오류 상세 메시지
}
```