# StudyFlow Chat Context Todo

This document tracks the product and technical work needed to make agent-organized, library-grounded chat the core StudyFlow experience.

## Product Goal

Build a ChatGPT-like study assistant that starts from the student's intent, selects the right StudyFlow library scope, packages the useful course context, streams a natural tutoring answer, and keeps citations connected to the original lecture pages or segments.

After login, StudyFlow should prioritize two product entries: Chat and Library. Library is the AI knowledge base management surface, not a study workflow page. Saved remains a quieter archive for reusable generated outputs. This keeps new users focused on the product's two core jobs: ask AI with course context, or manage retrievable sources.

The post-login product model is:

```text
Library -> manage knowledge base sources
Chat    -> learn from those sources
Saved   -> revisit reusable generated outputs
```

The chat should feel conversational, but the architecture must remain scope-first and citation-aware:

```text
student asks what to study
  -> planner infers intent and chooses internal tools
  -> resolve study scope from library
  -> recommend and confirm likely sources when needed
  -> package or retrieve grounded source context when needed
  -> stream answer
  -> show citations
  -> let student continue, quiz, summarize, or open the source
```

## Current Status

- Real PDF/TXT ingestion exists.
- Segments store source text, page anchors, character offsets, token estimates, and stable hashes.
- Reader micro actions use source-context v0:
  - selected `sourceRefs`
  - lexical/page-aware `relatedRefs`
- Embeddings are generated during upload when a real OpenAI key is configured; otherwise retrieval falls back to lexical ranking until reindexing fills missing vectors.
- pgvector schema support exists through `Segment.embedding vector(1536)`.
- Recommended MVP embedding model: `text-embedding-3-small`.
- Chat source preview is implemented. Manual "Check sources" previews likely materials, and auto-scope sends now pause for confirmation when multiple candidate materials are found.
- Teacher Mode prompt guidance is implemented as model-decided behavior with a deterministic hint/fallback. Beginner, from-scratch, and page-by-page learning requests should now produce fuller teacher-style explanations with examples.
- Explicit lecture-title topic narrowing is implemented for Chat and source preview. Named topics such as "lambda" prefer the matching material before broader hybrid retrieval.
- Exact page retrieval is implemented for Chat and source preview. Requests like "page 9" or "第九页" prioritize that page inside the selected or inferred source scope.
- Context breadth planning is partially implemented:
  - focused questions use top relevant passages
  - broad lessons use representative coverage across the selected lecture/topic
  - mock exam and midterm requests use representative coverage across the selected course materials
- Optional AI planner v1 is implemented. When a chat model is configured, the planner receives recent conversation plus a compact Library catalog summary, returns a validated structured plan, and falls back to deterministic planning if unavailable or invalid.
- Full-lecture learning now uses a larger lecture-pack context budget and a higher segment prefetch limit than focused retrieval, so "teach this whole lecture" is not treated like a top-k passage query.
- The core product model is agentic context orchestration, not a generic RAG chatbot. General explanations should use the model's normal tutoring ability; Library materials decide scope, order, course terminology, source-specific examples, and citations. Focused RAG is one context strategy, mostly for local questions, long documents, and precise source grounding.

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
- Pass recent chat history into generation prompts. Current implementation preserves recent turns and deterministically compacts older context into structured study memory covering source/scope, learning preferences, concepts already discussed, and pending directions; future work can replace or augment this with a model-generated conversation memory.
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

## Milestone 4: Context Retrieval Service

- Add a shared retrieval service used by chat and reader micro actions.
- Accept:
  - user id
  - natural-language query
  - optional folder/lecture/page/saved-scope filters
  - context mode
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

## Milestone 4.5: Planner and Internal Tools

- Add a lightweight planner before generation. It should infer whether the user needs casual chat, Teacher Mode, source preview, retrieval, save, quiz, cheat sheet, or library/file management. Current implementation includes an optional AI planner that receives recent conversation and Library catalog context, then returns a validated structured plan when a chat model is configured, with deterministic fallback when the model is unavailable or returns invalid JSON.
- Planner should decide context breadth: focused passages for specific questions, broad lesson coverage for learning a section/lecture, and broad assessment coverage for exams.
- Planner should decide context strategy, not just retrieval breadth:
  - `lecture_pack` for complete lecture, short source, and page-by-page teaching.
  - `focused_rag` for specific questions.
  - `broad_rag` for exams, quizzes, and wide review.
  - `long_document_map` for large PDFs/papers where full packing would waste context.
- Represent internal product capabilities as typed tools:
  - `library.catalog`. Initial deterministic catalog inspection is implemented for chat scope resolution, and the compact catalog summary is now also passed into the optional AI planner.
  - `scope.resolve`. Initial deterministic folder/course/file-title scope resolution is implemented before retrieval.
  - `source.preview`
  - `rag.retrieve`
  - `context.pack`. Initial lecture pack behavior is implemented for full-lecture learning requests.
  - `agent.teach`. Current implementation delegates final model behavior through a teaching-agent prompt boundary.
  - `artifact.save`. Initial planner-backed save request handling is implemented for recent source-grounded assistant outputs.
  - `library.manage`
  - `reader.open`. Initial planner-backed reader link handling is implemented for recent cited source refs.
- Store planner/tool traces on chat messages or sessions so failures can be debugged and evaluated. Current traces include `plannerSource` (`ai_planner` or `deterministic`), model, rationale, chosen tools, context strategy, and context coverage.
- Keep agent roles bounded but not over-scripted. The planner coordinates intent, Library scope, and internal API/tool use; the teaching agent has freedom to choose the lesson shape, examples, pacing, and follow-up style.
- Resolve scope from Library catalog before any search. Course/folder labels like `CSE 114A`, file titles like `lambda`, and manual selected sources should decide the context scope before embedding or lexical passage search runs.
- Do not use top-k retrieval as the default for every study request. For "teach this lecture" or "take me page by page," pack source-ordered lecture context first. Use retrieval when the question is focused, the source is long, or representative coverage is enough.
- Let the model decide Teacher Mode intent, with deterministic hints as fallback.
- Let the planner ask one concise confirmation question before calling tools that change state, such as save, delete, upload, move, or AI-assisted filing.
- Future upgrade: split planner, retrieval specialist, teacher, artifact curator, and library operator into separate agents while keeping the same internal tool contracts.
- LangChain/LangGraph is a future orchestration option, not an MVP requirement. Keep current planner/tool contracts local and typed first; adopt a graph runtime when branching, checkpoints, retries, human approval, or multi-agent handoffs become painful to maintain in local code.

## Milestone 5: Streaming Generation

- Add streaming chat response API. Current Chat API returns server-sent events for Chat, can optionally stream OpenAI chat completion when configured, and falls back to deterministic local generation streamed in chunks when no real key is present or the provider fails.
- Build prompts that include explicit source ids. Basic prompt packaging now includes `[S1]`-style source markers.
- Support response modes from quick action pills. The current generation prompt receives the selected mode.
- Require the model to use retrieved context as course grounding and citation trace, not as a hard limit on GPT tutoring ability.
- Allow natural explanations, examples, and background knowledge. Source markers should appear only when a specific claim is directly grounded in retrieved material, and the assistant must not fabricate citations.
- Save the final assistant answer after stream completion. Implemented for both streamed and non-streamed Chat replies, with retrieval/tool traces stored on the assistant message.
- Show partial response in the UI while preserving the final citation trace. Implemented for the active Chat page.

## Milestone 6: Context Quality Upgrades

- Hybrid vector + keyword retrieval. Implemented for Chat as `hybrid_vector_lexical_v0`.
- Query rewriting for course terminology. Initial bilingual study-term hints are implemented in the history-aware retrieval query, so Chinese study/exam/function/type requests carry retrieval-friendly English terms without importing casual chat.
- Model/tool-based intent classification for Teacher Mode and source selection. Current implementation provides prompt-level model judgment plus deterministic hints; future work should make this an explicit classifier/tool trace.
- Parent-child retrieval:
  - small passages for search
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
