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

- `file`: PDF or TXT file. PPTX is reserved for the slide-parser milestone.
- `folderId`: folder id owned by the current user.
- `title`: optional display title.

Current behavior:

- Validates authenticated user, file type, size, and folder ownership.
- Stores the original file in MinIO.
- Creates a `Lecture` row.
- Runs internal document ingestion:
  - TXT is decoded as UTF-8 text.
  - PDF is parsed with `pdf-parse`.
  - Text is normalized and split into source segments using page-aware, paragraph/sentence-aware character windows with overlap.
  - Each segment stores text, token estimate, character anchors, PDF page anchors when available, and a stable hash.

Important next step:

- Add embeddings and vector retrieval. Current ingestion can optionally generate OpenAI embeddings, write them to `Segment.embedding`, and let Chat try pgvector retrieval before falling back to lexical/page-aware retrieval.
- Upgrade PDF/PPTX ingestion to structure-aware chunking with page/slide layout anchors.

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

## Study APIs

## Planned: Study Chat APIs

### Create Chat Session

```http
POST /api/chat/sessions
Cookie: next-auth session
Content-Type: application/json
```

Creates a student-owned chat session. Optional initial scope can point to a folder, lecture, saved scope, or reader segment.

### Send Chat Message

```http
POST /api/chat/sessions/:id/messages
Cookie: next-auth session
Content-Type: application/json
```

Target behavior:

- Accept a natural-language study message.
- Resolve explicit or inferred library scope.
- Retrieve source segments with metadata filters.
- Use embeddings through pgvector when available, with lexical/page-aware fallback.
- Stream the answer to the frontend.
- Save user message, assistant answer, retrieved refs, final cited refs, and model metadata.

Current RAG status:

- Active implementation: lexical/page-aware retrieval v0 for reader micro actions.
- Active when configured: optional OpenAI embeddings, pgvector retrieval, and lexical fallback.
- Not active yet: reranking and streaming chat generation.
- Recommended embedding default: `text-embedding-3-small`, stored as 1536-dimensional vectors in `Segment.embedding`.

### Run Micro Action

```http
GET /api/study/actions?limit=50
Cookie: next-auth session
```

Lists saved study artifacts for the current user, newest first. The Saved page uses this endpoint.

Response:

```json
{
  "success": true,
  "data": {
    "artifacts": []
  }
}
```

```http
POST /api/study/actions
Cookie: next-auth session
Content-Type: application/json
```

Creates a source-backed study artifact from selected source segments. Current behavior is deterministic placeholder generation with retrieval v0: the endpoint creates a `Selection`, retrieves nearby/lexically related segments from the same lecture, creates an `Item`, stores selected source refs and retrieved context refs, and returns a short artifact for the reader UI. Later embedding retrieval and LLM generation should replace only the retrieval/scoring and content generation steps, not the request/response contract.

Request:

```json
{
  "lectureId": "lec_...",
  "segmentIds": ["seg_1", "seg_2"],
  "action": "explain",
  "instructions": "Use concise bilingual explanation."
}
```

Supported actions:

- `explain`
- `summarize`
- `key_terms`
- `mini_quiz`
- `cheat_sheet`

Response:

```json
{
  "success": true,
  "data": {
    "artifact": {
      "id": "item_...",
      "type": "explain",
      "itemType": "SUMMARY",
      "title": "Explain 2 source segments",
      "content": "Explanation draft grounded in the selected source: ...",
      "sourceRefs": [
        {
          "lectureId": "lec_...",
          "segmentId": "seg_...",
          "page": 12,
          "slide": null,
          "charStart": 120,
          "charEnd": 360,
          "label": "page 12 · seg_..."
        }
      ],
      "relatedRefs": [
        {
          "lectureId": "lec_...",
          "segmentId": "seg_related...",
          "page": 13,
          "slide": null,
          "charStart": 361,
          "charEnd": 680,
          "label": "page 13 · seg_related...",
          "score": 1.42,
          "reason": "lexical"
        }
      ],
      "createdAt": "2026-06-19T19:02:00.000Z"
    }
  }
}
```

### Planned: Resolve Study Scope

```http
POST /api/study/scopes
```

Creates or resolves a scope from selected segment ids, lecture ids, folder ids, or current reader context.

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

All generated artifacts should store selected source references and optional retrieved context references in a consistent shape:

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
  ],
  "relatedRefs": [
    {
      "lectureId": "lec_...",
      "segmentId": "seg_related...",
      "page": 4,
      "slide": null,
      "charStart": 361,
      "charEnd": 640,
      "score": 0.86,
      "reason": "nearby"
    }
  ]
}
```

This contract is what allows generated explanations, quizzes, and future cheat sheets to link back to explicit user-selected material while also showing which extra context the retrieval layer considered.
