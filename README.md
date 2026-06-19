# StudyFlow

> Citation-first study workspace for students who want their lecture materials, notes, AI help, and review context in one place.

StudyFlow helps students manage PDFs, lecture slides, and notes as long-lived course context. Instead of uploading a file to a chat tool and losing the context later, students can organize lectures by course, browse parsed source segments, select a precise study scope, and ask for small AI actions that stay grounded in the original material.

## Product Direction

StudyFlow is built around a simple idea: **the original lecture is the source of truth**.

Every parsed segment keeps source metadata such as lecture, page or slide, character range, hash, and future bounding boxes. AI outputs such as explanations, summaries, translations, key terms, quizzes, and future cheat sheets are saved as generated artifacts linked back to those source segments.

## Student Pain Points

- Lecture PDFs, slides, and notes are scattered across files, note apps, and chat sessions.
- ChatGPT can help once, but it does not preserve a stable course workspace.
- Students often want to study a few chapters or lectures, not their entire file library.
- AI study content is hard to trust when it does not cite the original page or slide.
- Real learning is interactive: read a small section, ask a quick question, translate a hard paragraph, generate a few quiz questions, then continue.

## MVP Scope

### 1. Course Material Workspace

- Account-based lecture library.
- Course/folder organization.
- Upload flow for student-owned PDFs, TXT notes, and later PPTX files.

### 2. Source-Aware Parsing

- Parse lecture files into source segments.
- Preserve lecture id, page or slide, character offsets, token count, content hash, and source references.
- Treat translated or generated content as derived artifacts, never as canonical source chunks.

### 3. Reader and Study Scope

- Browse parsed lecture segments.
- Select current segment, page, lecture, folder, or multiple lectures as a **Study Scope**.
- Use that scope for retrieval and generation.

### 4. Micro AI Actions

The first experience is not "click once and generate everything." StudyFlow should feel like an AI assistant beside the reading surface.

Initial actions:

- Explain selected content.
- Summarize a segment, page, or lecture scope.
- Translate selected content for bilingual study.
- Extract key terms.
- Generate a short mini quiz.

### 5. Citation-Backed Outputs

Every generated artifact stores `sourceRefs` so students can jump back to the original lecture segment. This is the foundation for reliable RAG, exam generation, and printable cheat sheets.

## RAG Architecture

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
