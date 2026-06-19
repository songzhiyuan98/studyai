# StudyFlow Architecture

StudyFlow is a student-owned study workspace. Its core architectural principle is that original lecture material remains the source of truth, while AI outputs are derived artifacts linked to source references.

## System Overview

```text
Student
  -> Web Workspace
  -> Upload API
  -> Object Storage
  -> Lecture + Segment Database
  -> Embedding Pipeline
  -> Retriever
  -> Library-Grounded Chat
  -> LLM Action Generator
  -> Saved Study Artifacts
```

## Core Concepts

### Lecture

A lecture is an uploaded source file such as a PDF, PPTX, or TXT note. It belongs to one user and one folder/course workspace.

### Segment

A segment is the smallest source-grounded unit used for reading, retrieval, and citations.

Important fields:

- `lectureId`
- `text`
- `page` or `slide`
- `charStart` and `charEnd`
- `bbox` for future PDF visual anchoring
- `hash`
- `tokenCount`
- `embedding`

### Study Scope

A study scope is the context boundary for an interaction. Retrieval must happen inside this boundary before generation.

Supported scope types:

- Current segment.
- Current page or slide.
- Current lecture.
- Selected lectures.
- Folder/course workspace.
- Saved study pack.

### Generated Artifact

A generated artifact is an explanation, summary, translation, key-term list, quiz, flashcard, or future cheat sheet. It stores generated content plus `sourceRefs` pointing to the original source segments.

### Study Chat

Study chat is the core product surface for active learning. It behaves like a focused ChatGPT-style tutor, but its knowledge base is the student's own StudyFlow library.

The assistant should start from a lightweight prompt such as "What do you want to study today?" The user can answer with a natural goal, for example "review Haskell functions from last week's lecture" or "quiz me on chapters 3 and 4." The system then resolves scope from the library, retrieves grounded context, streams the answer, and cites the exact source segments or pages it used.

The chat composer also owns the fixed-output actions. Explain, Summarize, Key terms, Mini quiz, and Cheat sheet should appear as small intent pills above the input. Selecting a pill does not leave chat; it sets the response mode for the next message or lets the student run that action against the current scope.

When source scope is uncertain, the assistant should ask for confirmation before retrieval-heavy generation. Example: "I found Haskell lecture pages 5-12 and the Lambda lecture. Use both, or only Haskell?" This confirmation step is part of the product, not an error state.

Chat should not replace the reader. Chat is the active learning entry point; the reader is where citations are inspected, precise scopes are selected, and source material is deeply read.

## RAG Data Flow

```text
User action
  -> Resolve Study Scope
  -> Apply metadata filters
  -> Retrieve relevant segments
  -> Deduplicate and pack context
  -> Generate action-specific output
  -> Validate citations
  -> Save artifact with sourceRefs
```

## Chat RAG Data Flow

```text
User chat message
  -> Conversation state
  -> Intent and study-goal extraction
     - free-form chat
     - fixed action pill mode
  -> Scope resolver
     - explicit selected folder, lecture, saved scope, or cited page
     - inferred course/lecture/topic from library metadata
     - fallback clarification when scope is ambiguous
  -> Optional source confirmation
     - skip when scope is explicit
     - ask when retrieval spans multiple plausible folders or lectures
  -> Retrieval query builder
     - natural-language query
     - optional rewritten query for lecture terminology
     - metadata filters by user, folder, lecture, page/slide, and status
  -> Hybrid retriever
     - vector search over Segment.embedding
     - keyword/lexical fallback
     - page or slide adjacency expansion
  -> Rerank and deduplicate
  -> Parent context expansion
     - retrieve small chunks
     - pack larger page/slide context for generation
  -> Prompt builder
     - instructions to stay inside retrieved context
     - source ids visible to the model
  -> Streaming LLM response
  -> Citation validation
  -> Save message, retrieved refs, answer refs, and optional artifact
```

The chat response should stream token-by-token for the user, while the backend preserves the full trace of retrieved source references. This gives the product the familiar ChatGPT feeling without losing the source-grounded study workflow.

### Chat Interaction Rules

- Natural-language input is always available.
- Quick action pills are optional accelerators, not separate pages.
- A selected pill controls the output format of the next assistant response.
- The assistant may ask one short source-confirmation question before generation when the scope is ambiguous.
- If the student chooses a scope manually, the assistant should not repeatedly ask for confirmation.
- Each answer should expose the sources it used and offer to open them in the reader.

## Ingestion Flow

```text
Upload file
  -> Validate type and size
  -> Store original in MinIO/S3
  -> Create Lecture record
  -> Parse content
  -> Chunk by structure
  -> Save Segment records
  -> Generate embeddings
  -> Mark lecture processed
```

Current implementation note:

- PDF and TXT parsing now create real source segments.
- Current retrieval v0 is lexical/page-aware and stores selected `sourceRefs` plus retrieved `relatedRefs`.
- Embeddings are not generated yet in the active upload path.
- The schema already reserves `Segment.embedding` as a 1536-dimensional pgvector field.

## Chunking Strategy

Chunking should preserve source fidelity before optimizing for AI generation.

- PDF: page, heading, paragraph, list, and later bounding box.
- PPTX: slide, title, bullet group, speaker notes.
- TXT: heading, paragraph, and list structure.
- Long blocks are recursively split by token budget.
- Short adjacent blocks may be merged when they share a source page/slide.
- Hashes prevent duplicate segment insertion.

## Translation Strategy

Translation is not part of ingestion. Original text remains canonical.

```text
Selected original segment(s)
  -> translation micro action
  -> generated translation artifact
  -> sourceRefs: original segment ids
```

This keeps RAG, citations, and source anchoring stable while supporting bilingual learning.

## Retrieval Strategy

Current retrieval v0:

- Filter by user and lecture.
- Compare selected text to candidate segments with lexical overlap.
- Expand nearby page context.
- Store selected refs and retrieved context refs separately.

Embedding retrieval target:

- Filter by user and study scope metadata.
- Search `Segment.embedding` through pgvector.
- Return top relevant segments with source metadata.
- Pack context with source ids visible to the prompt.

Embedding model target:

- Use `text-embedding-3-small` as the default OpenAI embedding model for MVP vector search.
- Keep `OPENAI_MODEL_EMBEDDING` configurable for future upgrades or provider swaps.
- Keep the vector dimension aligned with the database schema. The current schema expects 1536 dimensions, which matches `text-embedding-3-small`.

Advanced retrieval:

- Hybrid keyword + vector search.
- Parent-child retrieval.
- Reranking.
- MMR deduplication.
- Citation validation after generation.

## Frontend Architecture

```text
app/web/src/app
  /dashboard       Workspace overview
  /library         Knowledge base source management
  /chat            Library-grounded study chat
  /documents/[id]  Source reader and micro actions
  /saved           Saved generated artifacts
  /review          Legacy route for saved generated artifacts
  /study           Legacy/internal study scope builder
  /exam/[id]       Later assessment surface
```

The chat is the primary active learning surface. It should let a student start with an intent and let StudyFlow find the right library context. The reader remains the primary source-inspection surface, where students read, select, and verify cited material.

Primary logged-in navigation should stay focused on Chat, Library, and Saved. Study actions are product capabilities inside Chat and Reader, not a separate top-level destination.

## Safety Requirements

- Never use absolute external callback URLs for auth redirects.
- Generated outputs must carry source references.
- User data must be filtered by authenticated user id.
- RAG prompts should instruct the model to stay within provided source context.
- Unsupported claims should be omitted or marked as uncertain.
