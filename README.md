# StudyFlow

> A ChatGPT-style AI study workspace that turns a student's own lecture PDFs, slides, and notes into a searchable, source-grounded learning library.

StudyFlow is built for students who already have the right course materials but still struggle to turn them into an active learning workflow. Instead of uploading one PDF into a generic chatbot and losing the context later, students can build a personal knowledge base, ask what they want to study, and get tutoring responses grounded in their own lectures with citations back to the original sources.

The current product direction is simple: **Library is where students manage course materials. Chat is where they learn from them.**

## Why This Exists

Students usually study across lecture PDFs, slides, notes, screenshots, and old chat conversations. Existing note tools are good at storage, but weak at AI tutoring. General AI chat tools are powerful, but they do not naturally preserve a structured course library, source scope, or reusable study artifacts.

StudyFlow tries to close that gap:

- Keep course materials in one student-owned library.
- Let AI understand which lecture, folder, page range, or topic the student means.
- Teach in a conversational style instead of dumping one-off generated notes.
- Use course materials as grounding context while still allowing the model to explain with general tutoring knowledge.
- Attach citations so students can inspect the original source when needed.
- Save useful outputs such as explanations, summaries, quizzes, and future cheat sheets.

## Product Experience

### 1. Library: Student Knowledge Base

Students can upload and organize their own study materials into a course-like file system.

Current capabilities:

- Account-based library.
- Folder and nested material management.
- PDF and TXT upload.
- List/grid style library browsing.
- Batch selection and deletion.
- User-scoped cleanup of database records, parsed chunks, embeddings, and stored files.
- Ready/indexing state so Chat knows which files are searchable.

### 2. Chat: Core AI Learning Surface

Chat is the main product entry after login. It is designed to feel familiar, close to ChatGPT, but with source-aware study behavior.

Students can ask things like:

- "I need to review Haskell for my midterm. Teach me from the lecture."
- "Explain lambda calculus from my CSE 114A materials in Chinese."
- "Quiz me on the typeclasses lecture."
- "Summarize the key ideas from these notes."
- "Help me understand this page step by step."

Current capabilities:

- Persisted chat sessions and recent chat history.
- Streaming responses with a paced typing experience.
- Quick action pills: Ask freely, Explain, Summarize, Key terms, Mini quiz, Cheat sheet.
- Automatic source preview when a request may match multiple materials.
- Manual source selection when the student wants strict control.
- Saved output continuation back into Chat.
- Response language follows the user's language.
- Lesson memory inside the same chat so follow-up messages can continue the same learning context.

### 3. Reader: Source Inspection

Reader is a support surface for inspecting parsed material, not the main learning entry.

Current capabilities:

- Open a library file and inspect parsed source chunks.
- Review source metadata such as page and segment order.
- Select source chunks for focused learning.
- Jump from generated answers back toward the source context.

### 4. Saved: Reusable Study Artifacts

Generated outputs can be saved as study artifacts instead of disappearing inside chat.

Current direction:

- Store explanations, summaries, quizzes, translations, and future cheat sheets.
- Preserve source references with each saved artifact.
- Reopen a saved artifact in Chat with its original source scope.

## AI Architecture

StudyFlow is not just "RAG over PDFs." The product needs different context strategies for different study intents.

For a specific question, retrieval can find the most relevant chunks. For "teach me this lecture page by page," sending only the top few chunks is wrong because the model needs continuity. For a broad exam review, the system needs a wider course scope and representative coverage. StudyFlow therefore uses a planner-led context loop instead of a single fixed top-k retrieval path.

```text
Student message
  -> Planner / coordinator
  -> Library catalog inspection
  -> Source scope resolution
  -> Context strategy selection
  -> Context packaging or retrieval
  -> Teaching agent
  -> Streaming answer with source references
  -> Saved artifact or follow-up memory
```

### Planner-Led Context

The planner decides what the student is trying to do and how the system should use the library.

Current planner responsibilities:

- Detect intent: free chat, teaching, summary, quiz, key terms, cheat sheet, reader navigation, or library operation draft.
- Resolve likely source scope from library metadata before retrieval.
- Decide whether to ask for source confirmation.
- Choose a context strategy.
- Delegate the final response to the teaching prompt.
- Store planner traces for future debugging and evaluation.

### Context Strategies

StudyFlow supports several context modes:

- `lecture_pack`: for complete lecture or page-by-page teaching. Source passages are packed in document order.
- `focused_rag`: for specific local questions, definitions, or confusion around a narrow topic.
- `broad_rag`: for exams and wide review across a course or folder.
- `long_document_map`: for large PDFs where full source packing would be too large, using page maps and representative passages.

### RAG and Embeddings

RAG is used as a context tool, not as a restriction on the model's intelligence.

The assistant can use general model knowledge to explain concepts, give examples, build intuition, and answer normal questions. The student's materials are used to choose the right learning scope, align with course wording/order, and attach trustworthy source references.

Current retrieval capabilities:

- PDF/TXT parsing into source-aware segments.
- Page-aware and source-order metadata.
- Optional OpenAI embedding generation.
- PostgreSQL + pgvector storage.
- Hybrid vector and lexical retrieval.
- Metadata filtering by authenticated user and selected lecture scope.
- Lexical fallback when embeddings are unavailable.

Recommended default embedding model:

- `text-embedding-3-small`

## Multi-Tenant Data Model

StudyFlow uses shared infrastructure with user-scoped data isolation.

- Users own folders, lectures, chat sessions, messages, saved artifacts, and uploads.
- Segment embeddings inherit ownership through their lecture.
- Retrieval joins segments to lectures and filters by authenticated user before ranking.
- Deleting a lecture cascades through its segments/embeddings and removes the stored source file.

Future production hardening should add PostgreSQL row-level security and stricter tenant indexes, but the product model does not require one physical vector database per user for the MVP.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS.
- Auth: NextAuth.js with credential auth.
- Database: PostgreSQL, Prisma, pgvector.
- Storage: MinIO locally, S3-compatible storage in production.
- AI: OpenAI-compatible chat and embedding APIs, with deterministic local fallbacks for development.
- Ingestion: PDF/TXT parsing with source-aware segmentation.

## Repository Structure

```text
app/web          Next.js application
packages/db     Prisma schema, database client, seed scripts
packages/shared Shared types and utilities
packages/ui     Shared UI package
docs            Product, architecture, roadmap, and debugging notes
infra/docker    Local PostgreSQL, Redis, and MinIO setup
```

## Local Development

```bash
pnpm install
pnpm docker:up
pnpm --filter @study-assistant/db push
pnpm --filter @study-assistant/db seed
pnpm --filter @study-assistant/web dev
```

The web app usually runs at `http://localhost:3000`. If that port is occupied, Next.js will use another available port.

Useful checks:

```bash
pnpm --filter @study-assistant/web type-check
pnpm --filter @study-assistant/web build
```

## Environment Variables

Create `.env` at the repository root and `app/web/.env.local` for local development.

Key variables:

```text
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET_NAME=
MINIO_USE_SSL=

OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_CHAT=gpt-4o-mini
OPENAI_MODEL_EMBEDDING=text-embedding-3-small
```

For a hosted preview, the local Docker services need to be replaced by a production Postgres database with pgvector support and S3-compatible object storage.

## Roadmap

Near-term product work:

- Improve planner evaluation cases and source-scope accuracy.
- Add long-term chat memory summaries for multi-session study plans.
- Improve teacher-mode pacing for multi-turn lessons.
- Add PPTX parsing.
- Add stronger citation validation.
- Add printable cheat sheet generation.
- Add richer saved study packs for midterm/final review.

Longer-term direction:

- Agentic library operations from Chat, with confirmation before file changes.
- Assessment coach for mock exams and grading feedback.
- Flashcard and cheat-sheet export.
- LangGraph-style orchestration if planner workflows become complex enough to justify it.

## Status

StudyFlow is an active MVP exploring how a student-owned AI learning workspace should work when Chat, Library, RAG, source citations, and saved study artifacts are designed as one product instead of separate tools.
