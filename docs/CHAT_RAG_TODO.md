# StudyFlow Chat RAG Todo

This document tracks the product and technical work needed to make library-grounded chat the core StudyFlow experience.

## Product Goal

Build a ChatGPT-like study assistant that starts from the student's intent, searches their StudyFlow library, streams a grounded answer, and keeps citations connected to the original lecture pages or segments.

After login, StudyFlow should prioritize two product entries: Chat and Library. Library is the AI knowledge base management surface, not a study workflow page. Saved remains a quieter archive for reusable generated outputs. This keeps new users focused on the product's two core jobs: ask AI with course context, or manage retrievable sources.

The post-login product model is:

```text
Library -> manage knowledge base sources
Chat    -> learn from those sources
Saved   -> revisit reusable generated outputs
```

The chat should feel conversational, but the architecture must remain citation-first:

```text
student asks what to study
  -> resolve study scope from library
  -> confirm source when needed
  -> retrieve grounded source context
  -> stream answer
  -> show citations
  -> let student continue, quiz, summarize, or open the source
```

## Current Status

- Real PDF/TXT ingestion exists.
- Segments store source text, page anchors, character offsets, token estimates, and stable hashes.
- Reader micro actions use retrieval v0:
  - selected `sourceRefs`
  - lexical/page-aware `relatedRefs`
- Embeddings are not generated yet in the upload path.
- pgvector schema support exists through `Segment.embedding vector(1536)`.
- Recommended MVP embedding model: `text-embedding-3-small`.

## Milestone 1: Chat Product Surface

- Add `/chat` as a first-class navigation item.
- Make Chat and Library the two primary post-login entries, with Saved as the secondary archive.
- Replace the logged-in top navigation with a left app sidebar.
- Keep chat history in the app sidebar while the user is in Chat, not on the Workspace overview.
- Keep the Chat page itself focused on only useful chat elements: message stream, quick action pills, source confirmation, citations, and composer.
- Build a clean desktop and mobile chat layout.
- Opening prompt: "What do you want to study today?"
- Add quick action pills above the composer:
  - Explain
  - Summarize
  - Key terms
  - Mini quiz
  - Cheat sheet
- Add scope chips:
  - all library
  - folder/course
  - lecture
  - current reader segment
  - recent uploads
- Add a source confirmation state:
  - ask when the user intent matches several plausible sources
  - show candidate folders, lectures, or page ranges
  - let the student approve, remove, or change sources before generation
  - skip confirmation when the student has already selected an explicit scope
- Show cited sources beside or below assistant messages.
- Let citations open `/documents/[id]` at the referenced segment.

## Milestone 2: Chat Data Model

- Add chat session storage.
- Add chat message storage.
- Store message role, content, status, model, token usage, and timestamps.
- Store retrieval traces:
  - selected scope
  - source confirmation decision
  - retrieved segment ids
  - reranked segment ids
  - final cited segment ids
- Keep chat session ownership scoped by authenticated user id.

## Milestone 3: Embedding Pipeline

- Generate embeddings after successful ingestion. Basic optional OpenAI generation is wired in the web ingestion route.
- Write vectors to `Segment.embedding`. Basic pgvector writes are wired when a real `OPENAI_API_KEY` is configured.
- Track embedding status on lecture or segment records.
- Make embedding generation retryable.
- Keep `OPENAI_MODEL_EMBEDDING` configurable.
- Default to `text-embedding-3-small` for 1536-dimensional pgvector compatibility.

## Milestone 4: Retrieval Endpoint

- Add a shared retrieval service used by chat and reader micro actions.
- Accept:
  - user id
  - natural-language query
  - optional folder/lecture/page/saved-scope filters
  - retrieval mode
- Return:
  - selected query
  - ranked segments
  - source references
  - packed context
- Retrieval strategy:
  - metadata filter first
  - vector search when embeddings exist. Chat now attempts pgvector retrieval first when embeddings are configured.
  - lexical fallback when vectors are missing
  - page/slide adjacency expansion
  - deduplication before context packing

## Milestone 5: Streaming Generation

- Add streaming chat response API. Current Chat API can optionally call OpenAI chat completion when configured, then falls back to deterministic local generation when no real key is present.
- Build prompts that include explicit source ids. Basic prompt packaging now includes `[S1]`-style source markers.
- Support response modes from quick action pills. The current generation prompt receives the selected mode.
- Require the model to answer only from retrieved context. The current prompt enforces source-grounded answering.
- Save the final assistant answer after stream completion.
- Show partial response in the UI while preserving the final citation trace.

## Milestone 6: RAG Quality Upgrades

- Hybrid vector + keyword retrieval.
- Query rewriting for course terminology.
- Parent-child retrieval:
  - small chunks for search
  - larger page/slide context for generation
- Reranking.
- MMR or equivalent deduplication.
- Citation validation after generation.
- Evaluation set using uploaded lecture PDFs and expected source pages.

## Product Boundaries

- Chat is the active learning entry point.
- Quick action pills are chat accelerators, not separate workflows.
- Reader is the source inspection and precise selection surface.
- Saved stores reusable generated outputs.
- Study is not a primary navigation surface; its fixed actions live in Chat pills and in the Reader's source-action panel.
- Cheat sheet generation should build on the same chat/retrieval pipeline, not a separate one-off flow.
