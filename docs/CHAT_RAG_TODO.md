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
  -> planner infers intent and chooses internal tools
  -> resolve study scope from library
  -> recommend and confirm likely sources when needed
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
- Embeddings are generated during upload when a real OpenAI key is configured; otherwise retrieval falls back to lexical ranking until reindexing fills missing vectors.
- pgvector schema support exists through `Segment.embedding vector(1536)`.
- Recommended MVP embedding model: `text-embedding-3-small`.
- Chat source preview is implemented. Manual "Check sources" previews likely materials, and auto-scope sends now pause for confirmation when multiple candidate materials are found.
- Teacher Mode prompt guidance is implemented as model-decided behavior with a deterministic hint/fallback. Beginner, from-scratch, and page-by-page learning requests should now produce fuller teacher-style explanations with examples.
- Explicit lecture-title topic narrowing is implemented for Chat and source preview. Named topics such as "lambda" prefer the matching material before broader hybrid retrieval.
- Exact page retrieval is implemented for Chat and source preview. Requests like "page 9" or "第九页" prioritize that page inside the selected or inferred source scope.

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
  - auto scope across all ready Library sources. Implemented as the default Chat behavior.
  - folder/course
  - lecture
  - current reader segment
  - recent uploads
- Add a source confirmation state:
  - ask when the user intent matches several plausible sources. Implemented for auto-scope chat sends with multiple candidate materials.
  - show AI/retriever-recommended candidate folders, lectures, or page ranges. Implemented at the lecture/material level.
  - let the student approve, remove, or change sources before generation. Implemented with selectable source preview materials.
  - support manual "Check sources" now and future model/tool-triggered source checks. Manual preview and automatic pre-send preview are implemented; model/tool orchestration remains future work.
  - skip confirmation when the student has already selected an explicit scope. Implemented.
- Show cited sources beside or below assistant messages.
- Let citations open `/documents/[id]` at the referenced segment.

## Milestone 2: Chat Data Model

- Add chat session storage. Implemented with `ChatSession`.
- Add chat message storage. Implemented with `ChatMessage`.
- Store message role, content, status, model, token usage, and timestamps. Current implementation stores role, content, mode, title, retrieval trace, source refs, and timestamps; token usage is still future work.
- Pass recent chat history into generation prompts. Current implementation preserves recent turns and deterministically compacts older context when the prompt would grow too long; future work can replace this with a model-generated conversation memory.
- Store retrieval traces. Current implementation stores retrieval JSON and source refs:
  - selected scope
  - source confirmation decision
  - retrieved segment ids
  - reranked segment ids
  - final cited segment ids
- Keep chat session ownership scoped by authenticated user id. Implemented in session list/detail and chat persistence APIs.

## Milestone 3: Embedding Pipeline

- Generate embeddings after successful ingestion. Basic optional OpenAI generation is wired in the web ingestion route.
- Write vectors to `Segment.embedding`. Basic pgvector writes are wired when a real `OPENAI_API_KEY` is configured.
- Track embedding status on lecture or segment records.
- Make embedding generation retryable. Current implementation adds a user-scoped `/api/lectures/reindex` backfill endpoint for processed segments missing embeddings.
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
  - vector search when embeddings exist
  - lexical keyword retrieval over the same user-scoped candidates
  - hybrid merge when both vector and lexical results are available
  - lexical fallback when vectors are missing or provider calls fail
  - page/slide adjacency expansion
  - deduplication before context packing

## Milestone 4.5: Chat Planner and Internal Tools

- Add a lightweight planner before generation. It should infer whether the user needs casual chat, Teacher Mode, source preview, retrieval, save, quiz, cheat sheet, or library/file management.
- Represent internal product capabilities as typed tools:
  - `source.preview`
  - `rag.retrieve`
  - `artifact.save`
  - `library.manage`
  - `reader.open`
- Store planner/tool traces on chat messages or sessions so failures can be debugged and evaluated.
- Let the model decide Teacher Mode intent, with deterministic hints as fallback.
- Let the planner ask one concise confirmation question before calling tools that change state, such as save, delete, upload, move, or AI-assisted filing.
- Future upgrade: split planner, retrieval specialist, teacher, artifact curator, and library operator into separate agents while keeping the same internal tool contracts.

## Milestone 5: Streaming Generation

- Add streaming chat response API. Current Chat API returns server-sent events for Chat, can optionally stream OpenAI chat completion when configured, and falls back to deterministic local generation streamed in chunks when no real key is present or the provider fails.
- Build prompts that include explicit source ids. Basic prompt packaging now includes `[S1]`-style source markers.
- Support response modes from quick action pills. The current generation prompt receives the selected mode.
- Require the model to use retrieved context as course grounding and citation trace, not as a hard limit on GPT tutoring ability.
- Allow natural explanations, examples, and background knowledge. Source markers should appear only when a specific claim is directly grounded in retrieved material, and the assistant must not fabricate citations.
- Save the final assistant answer after stream completion. Current UI receives the final full message over the `done` event; persistent chat history is still future work.
- Show partial response in the UI while preserving the final citation trace. Implemented for the active Chat page.

## Milestone 6: RAG Quality Upgrades

- Hybrid vector + keyword retrieval. Implemented for Chat as `hybrid_vector_lexical_v0`.
- Query rewriting for course terminology.
- Model/tool-based intent classification for Teacher Mode and source selection. Current implementation provides prompt-level model judgment plus deterministic hints; future work should make this an explicit classifier/tool trace.
- Parent-child retrieval:
  - small chunks for search
  - larger page/slide context for generation
- Reranking.
- MMR or equivalent deduplication.

## Multi-Tenant Isolation Checklist

- Keep one shared PostgreSQL/pgvector database for MVP operations.
- Require every retrieval path to filter by authenticated `userId` before ranking or generation.
- Keep uploaded object keys user-scoped under `uploads/{userId}/...`.
- Ensure deletes remove the user's lecture, cascade segment embeddings, and remove the stored source object.
- Add regression tests around any new raw SQL vector query to prevent cross-user retrieval.
- Consider PostgreSQL row-level security before production launch.
- Citation validation after generation.
- Evaluation set using uploaded lecture PDFs and expected source pages.

## Product Boundaries

- Chat is the active learning entry point.
- Quick action pills are chat accelerators, not separate workflows.
- Reader is the source inspection and precise selection surface.
- Saved stores reusable generated outputs.
- Study is not a primary navigation surface; its fixed actions live in Chat pills and in the Reader's source-action panel.
- Cheat sheet generation should build on the same chat/retrieval pipeline, not a separate one-off flow.
