# StudyFlow API Notes

StudyFlow currently uses Next.js App Router API routes under `/api`. APIs are session-authenticated through NextAuth cookies.

## Authentication

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "email": "student@example.com",
  "password": "securePassword123",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

Response:

```json
{
  "message": "注册成功",
  "user": {
    "id": "cm...",
    "email": "student@example.com",
    "name": "LovelaceAda",
    "role": "STUDENT",
    "createdAt": "2026-06-19T19:16:10.295Z"
  }
}
```

### Login

Login is handled by NextAuth credentials provider through the frontend login form. Callback URLs must be sanitized to same-app relative paths before being passed to `signIn`.

## Folders

### List Folders

```http
GET /api/folders
Cookie: next-auth session
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "cm...",
      "name": "通用文档",
      "description": "默认文件夹",
      "documentCount": 0,
      "createdAt": "2026-06-19T19:16:10.295Z",
      "updatedAt": "2026-06-19T19:16:10.295Z"
    }
  ]
}
```

### Create Folder

```http
POST /api/folders
Cookie: next-auth session
Content-Type: application/json
```

Request:

```json
{
  "name": "CS229",
  "description": "Machine learning lecture materials"
}
```

## Lectures

### Upload Lecture

```http
POST /api/lectures
Cookie: next-auth session
Content-Type: multipart/form-data
```

Form fields:

- `file`: PDF, PPTX, or TXT file.
- `folderId`: folder id owned by the current user.
- `title`: optional display title.

Current behavior:

- Validates authenticated user, file type, size, and folder ownership.
- Stores the original file in MinIO.
- Creates a `Lecture` row.
- Runs an internal mock processing step that creates placeholder segments.

Important next step:

- Replace mock processing with real TXT/PDF parsing and structure-aware chunking.

### List Lectures

```http
GET /api/lectures?folderId=<id>&status=PROCESSED&type=PDF&page=1&limit=20
Cookie: next-auth session
```

Response shape:

```json
{
  "success": true,
  "data": {
    "lectures": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "pages": 0
    }
  }
}
```

### Get Lecture Detail

```http
GET /api/lectures/:id
Cookie: next-auth session
```

Returns one lecture owned by the current user with its folder and ordered source segments. The reader uses this endpoint to render source-backed study scope selection.

Response shape:

```json
{
  "success": true,
  "data": {
    "lecture": {
      "id": "lec_...",
      "title": "Linear Regression",
      "originalName": "linear-regression.pdf",
      "type": "PDF",
      "status": "PROCESSED",
      "fileSize": 4096,
      "createdAt": "2026-06-19T19:00:00.000Z",
      "folder": {
        "id": "folder_...",
        "name": "Machine Learning"
      },
      "segments": [
        {
          "id": "seg_...",
          "text": "Segment text...",
          "tokenCount": 42,
          "page": 2,
          "slide": null,
          "charStart": 120,
          "charEnd": 360,
          "createdAt": "2026-06-19T19:02:00.000Z"
        }
      ]
    }
  }
}
```

## Planned Study APIs

The frontend is being aligned around these future APIs:

### Resolve Study Scope

```http
POST /api/study/scopes
```

Creates or resolves a scope from selected segment ids, lecture ids, folder ids, or current reader context.

### Run Micro Action

```http
POST /api/study/actions
```

Request:

```json
{
  "scope": {
    "type": "segments",
    "segmentIds": ["seg_1", "seg_2"]
  },
  "action": "explain",
  "instructions": "Use concise bilingual explanation."
}
```

Planned actions:

- `explain`
- `summarize`
- `translate`
- `key_terms`
- `mini_quiz`

Response:

```json
{
  "success": true,
  "data": {
    "artifactId": "item_...",
    "type": "explain",
    "content": "...",
    "sourceRefs": [
      {
        "lectureId": "lec_...",
        "segmentId": "seg_...",
        "page": 12
      }
    ]
  }
}
```

### RAG Retrieval

```http
POST /api/retrieval/query
```

Planned behavior:

- Apply user and study-scope metadata filters.
- Retrieve relevant `Segment` rows using pgvector.
- Optionally combine keyword search and reranking later.
- Return source refs and packed context for generation.

## Source Reference Contract

All generated artifacts should store source references in a consistent shape:

```json
{
  "sourceRefs": [
    {
      "lectureId": "lec_...",
      "segmentId": "seg_...",
      "page": 3,
      "slide": null,
      "charStart": 120,
      "charEnd": 360
    }
  ]
}
```

This contract is what allows generated explanations, translations, quizzes, and future cheat sheets to link back to the original lecture material.
