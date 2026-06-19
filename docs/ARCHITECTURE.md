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

MVP retrieval:

- Filter by user and study scope metadata.
- Search `Segment.embedding` through pgvector.
- Return top relevant segments with source metadata.
- Pack context with source ids visible to the prompt.

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
  /library         Course material library
  /upload          Lecture upload and folder selection
  /documents/[id]  Source reader and micro actions
  /study           Study scope builder
  /review          Saved generated artifacts
  /exam/[id]       Later assessment surface
```

The reader is the primary product surface. It should let a student read, select, and ask small contextual questions without leaving the lecture.

## Safety Requirements

- Never use absolute external callback URLs for auth redirects.
- Generated outputs must carry source references.
- User data must be filtered by authenticated user id.
- RAG prompts should instruct the model to stay within provided source context.
- Unsupported claims should be omitted or marked as uncertain.
