# StudyFlow

> Citation-first study workspace for students who want their lecture materials, notes, AI help, and review context in one place.

StudyFlow helps students manage PDFs, lecture slides, and notes as long-lived course context. Instead of uploading a file to a chat tool and losing the context later, students can organize lectures by course, ask a ChatGPT-like study assistant what they want to learn today, and get answers grounded in their own library with page-level citations.

## Product Direction

StudyFlow is built around a simple idea: **the original lecture is the source of truth**.

Every parsed segment keeps source metadata such as lecture, page or slide, character range, hash, and future bounding boxes. AI outputs such as explanations, summaries, translations, key terms, quizzes, and future cheat sheets are saved as generated artifacts linked back to those source segments.

## Student Pain Points

- Lecture PDFs, slides, and notes are scattered across files, note apps, and chat sessions.
- ChatGPT can help once, but it does not preserve a stable course workspace.
- Students often want to study a few chapters or lectures, not their entire file library.
- AI study content is hard to trust when it does not cite the original page or slide.
- Real learning is interactive: ask what to study, narrow the scope, read a small section, ask a quick question, generate a few quiz questions, then continue.

## MVP Scope

### 1. Knowledge Base Management

- Account-based knowledge base for student-owned lecture sources.
- Collection/course organization.
- Upload flow for PDFs, TXT notes, and later PPTX files.
- Source status showing whether a file is ready for Chat context.

### 2. Source-Aware Parsing

- Parse lecture files into source segments.
- Preserve lecture id, page or slide, character offsets, token count, content hash, and source references.
- Treat translated or generated content as derived artifacts, never as canonical source passages.

### 3. Library-Grounded Chat

The primary AI surface should feel like a focused study chat, not a one-shot generator.

- After login, Chat and Library are the two primary product entries; Saved is a quieter archive for generated outputs.
- The assistant opens with a lightweight prompt such as "What do you want to study today?"
- Students can ask natural questions like "help me review Haskell functions for tomorrow's quiz".
- StudyFlow resolves the intended course, lecture, chapter, page range, or folder from the library.
- The default chat scope is automatic across all ready Library sources; manual source selection is available when the student wants a strict scope.
- The planner resolves the likely study scope, chooses the right context strategy, passes the selected material manifest to the teaching agent, then streams a conversational answer with citations.
- Fixed-output actions appear as small pills above the composer, so students can quickly request Explain, Summarize, Key terms, Mini quiz, or Cheat sheet without leaving chat.
- When the source scope is ambiguous, the assistant confirms the intended folder, lecture, or pages before generating.

### 4. Reader and Source Scope

- Browse parsed lecture segments.
- Select current segment, page, lecture, folder, or multiple lectures as a source scope.
- Use that scope for context packaging and generation.
- Open cited pages from chat answers to inspect the original source.

### 5. Micro AI Actions

Micro actions remain useful inside the reader, but their main home is the chat composer as quick action pills. They turn common student requests into structured outputs while still allowing free natural-language conversation.

Initial actions:

- Explain selected content.
- Summarize a segment, page, or lecture scope.
- Translate selected content for bilingual study.
- Extract key terms.
- Generate a short mini quiz.

### 6. Saved Citation-Backed Outputs

Every generated artifact stores `sourceRefs` so students can jump back to the original lecture segment. The Saved area is the archive for reusable summaries, translations, quizzes, and future cheat sheets. Saved outputs can also reopen Chat with a draft prompt and the original source scope, so an archived result can become the next tutoring turn instead of a dead note.

## Agentic Context Architecture

Current implementation status:

- Implemented: real PDF/TXT parsing, page-aware source segments, selected source refs, optional AI planner, scope resolution from Library metadata, selected material manifests for the teaching agent, lecture-pack context for full-source learning, lexical/page-aware retrieval v0, optional OpenAI embedding generation, pgvector writes, hybrid Chat retrieval that merges vector and lexical results, optional OpenAI chat generation, server-side SSE streaming with local fallback streaming, persisted chat sessions/messages, and Saved-to-Chat continuation for source-backed outputs.
- Not implemented yet: reranking and deeper long-term chat memory.
- Existing database direction: `Segment.embedding` is prepared for 1536-dimensional vectors.
- Recommended embedding default: `text-embedding-3-small`, configurable through environment variables. It matches the existing 1536-dimensional schema and is the better default than the older `text-embedding-ada-002` for a student SaaS cost/quality profile.

```text
Upload
  -> Parser
  -> Structure-aware Passage Builder
  -> Source Anchor Builder
  -> Embedding Generator
  -> Segment Store + pgvector Index
  -> Planner + Study Scope Resolver
  -> Context Packager
  -> Teaching Agent / Action Generator
  -> Citation Validator
  -> Saved Study Artifacts
```

Core chat context loop:

```text
student message
  -> planner infers intent and needed tools
  -> resolve course/folder/lecture/page scope from Library metadata
  -> pass selected material manifest to the teaching agent
  -> choose context strategy: lecture_pack, focused retrieval, broad review, or long document map
  -> package source context with source refs
  -> streaming LLM answer
  -> citation validation
  -> save conversation turn + cited refs
```

StudyFlow context is scope-first:

```text
student action + selected study scope
  -> metadata filter by user/course/folder/lecture
  -> ordered lecture packing or retrieval inside that scope
  -> optional embedding, keyword, and rerank upgrades
  -> context packing by source order and topic
  -> generation with source references
```

The material manifest and the retrieval window are intentionally different. For broad study goals such as exam review, the selected materials represent the intended learning scope, while retrieved passages are the current context window used to ground the next answer. For full-lecture or page-by-page teaching, `lecture_pack` sends source-ordered material instead of treating top-k retrieval as the lesson.

Multi-tenant context isolation:

- StudyFlow uses one physical PostgreSQL/pgvector database for the MVP, not one vector database per user.
- Isolation is enforced at the data and query layer: folders, lectures, chat sessions, chat messages, selections, and uploaded object keys are owned by `userId`.
- Segment embeddings inherit ownership through their lecture. Vector search joins `segments` to `lectures` and filters by the authenticated `user_id` before ranking.
- Deleting a lecture deletes its segments and embeddings through cascade behavior, and removes the user-scoped stored file object.
- Future production hardening should add PostgreSQL row-level security and direct tenant indexes where needed, but the product model should remain tenant-scoped shared infrastructure unless enterprise hard isolation is required.

Planned advanced context upgrades:

- Parent-child retrieval: small passages for search, larger page/slide context for generation.
- MMR deduplication to avoid repeated context.
- Citation validation to detect unsupported generated claims.
- Richer saved study packs so a student can continue the same review session later across multiple outputs and source scopes.
- Conversational memory that stores user goals and selected study scopes without mixing unrelated courses.

## Future Cheat Sheet Feature

Cheat sheets are a roadmap feature, not a blocker for the first context loop. The intended design is:

- Student selects lectures or a saved study scope.
- Student chooses constraints such as one-page printable, midterm review, formulas only, bilingual terms, or source-cited summary.
- StudyFlow packages and compresses relevant passages, groups them by topic, and exports a clean printable sheet with citations.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS.
- Auth: NextAuth.js.
- Database: PostgreSQL, Prisma, pgvector.
- Storage: MinIO/S3-compatible object storage.
- Background processing: BullMQ/Redis planned for ingestion and generation jobs.

## Development

```bash
pnpm install
pnpm docker:up
pnpm --filter @study-assistant/db push
pnpm --filter @study-assistant/db seed
pnpm --filter @study-assistant/web dev
```

The local frontend usually runs at `http://localhost:3000`; if that port is occupied, Next.js will use the next available port.
