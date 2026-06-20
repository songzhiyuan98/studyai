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
- Source status showing whether a file is ready for Chat retrieval.

### 2. Source-Aware Parsing

- Parse lecture files into source segments.
- Preserve lecture id, page or slide, character offsets, token count, content hash, and source references.
- Treat translated or generated content as derived artifacts, never as canonical source chunks.

### 3. Library-Grounded Chat

The primary AI surface should feel like a focused study chat, not a one-shot generator.

- After login, Chat and Library are the two primary product entries; Saved is a quieter archive for generated outputs.
- The assistant opens with a lightweight prompt such as "What do you want to study today?"
- Students can ask natural questions like "help me review Haskell functions for tomorrow's quiz".
- StudyFlow resolves the intended course, lecture, chapter, page range, or folder from the library.
- RAG retrieves relevant source segments and pages, then streams a conversational answer with citations.
- Fixed-output actions appear as small pills above the composer, so students can quickly request Explain, Summarize, Key terms, Mini quiz, or Cheat sheet without leaving chat.
- When the source scope is ambiguous, the assistant confirms the intended folder, lecture, or pages before generating.

### 4. Reader and Source Scope

- Browse parsed lecture segments.
- Select current segment, page, lecture, folder, or multiple lectures as a source scope.
- Use that scope for retrieval and generation.
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

Every generated artifact stores `sourceRefs` so students can jump back to the original lecture segment. The Saved area is the archive for reusable summaries, translations, quizzes, and future cheat sheets.

## RAG Architecture

Current implementation status:

- Implemented: real PDF/TXT parsing, page-aware source segments, selected source refs, lexical/page-aware retrieval v0, optional OpenAI embedding generation, pgvector writes, vector-first Chat retrieval with lexical fallback, optional OpenAI chat generation, server-side SSE streaming with local fallback streaming, and persisted chat sessions/messages.
- Not implemented yet: reranking and deeper long-term chat memory.
- Existing database direction: `Segment.embedding` is prepared for 1536-dimensional vectors.
- Recommended embedding default: `text-embedding-3-small`, configurable through environment variables. It matches the existing 1536-dimensional schema and is the better default than the older `text-embedding-ada-002` for a student SaaS cost/quality profile.

```text
Upload
  -> Parser
  -> Structure-aware Chunker
  -> Source Anchor Builder
  -> Embedding Generator
  -> Segment Store + pgvector Index
  -> Study Scope Filter
  -> Retriever
  -> Context Packager
  -> LLM Action Generator
  -> Citation Validator
  -> Saved Study Artifacts
```

Core chat RAG loop:

```text
student message
  -> intent + scope resolver
  -> library metadata filter
  -> query embedding
  -> hybrid retrieval: vector + lexical + page adjacency
  -> rerank + deduplicate
  -> context pack with source refs
  -> streaming LLM answer
  -> citation validation
  -> save conversation turn + cited refs
```

StudyFlow RAG is scope-first:

```text
student action + selected study scope
  -> metadata filter by user/course/folder/lecture
  -> vector retrieval inside the scope
  -> optional keyword and rerank upgrades
  -> context packing by source order and topic
  -> generation with source references
```

Planned advanced RAG upgrades:

- Hybrid search with keyword and vector retrieval.
- Parent-child retrieval: small chunks for retrieval, larger page/slide context for generation.
- MMR deduplication to avoid repeated context.
- Citation validation to detect unsupported generated claims.
- Saved study scopes so a student can continue the same review session later.
- Conversational memory that stores user goals and selected study scopes without mixing unrelated courses.

## Future Cheat Sheet Feature

Cheat sheets are a roadmap feature, not a blocker for the first RAG loop. The intended design is:

- Student selects lectures or a saved study scope.
- Student chooses constraints such as one-page printable, midterm review, formulas only, bilingual terms, or source-cited summary.
- StudyFlow retrieves and compresses relevant segments, groups them by topic, and exports a clean printable sheet with citations.

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
