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
  -> Planner + Scope Resolver
  -> Context Packager / Retriever
  -> Library-Grounded Chat
  -> Teaching Agent / Action Generator
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

A generated artifact is an explanation, summary, translation, key-term list, quiz, flashcard, or future cheat sheet. It stores generated content plus `sourceRefs` pointing to the original source segments. The Saved surface can reopen Chat with a draft prompt and the artifact's lecture scope, turning archived outputs back into active tutoring context.

### Study Chat

Study chat is the core product surface for active learning. It behaves like a focused ChatGPT-style tutor, but its knowledge base is the student's own StudyFlow library.

The assistant should start from a lightweight prompt such as "What do you want to study today?" The user can answer with a natural goal, for example "review Haskell functions from last week's lecture" or "quiz me on chapters 3 and 4." The system then resolves scope from the library, retrieves grounded context, streams the answer, and cites the exact source segments or pages it used.

The chat composer also owns the fixed-output actions. Explain, Summarize, Key terms, Mini quiz, and Cheat sheet should appear as small intent pills above the input. Selecting a pill does not leave chat; it sets the response mode for the next message or lets the student run that action against the current scope.

When source scope is uncertain, the assistant should ask for confirmation before retrieval-heavy generation. Example: "I found Haskell lecture pages 5-12 and the Lambda lecture. Use both, or only Haskell?" This confirmation step is part of the product, not an error state.

Chat should not replace the reader. Chat is the active learning entry point; the reader is where citations are inspected, precise scopes are selected, and source material is deeply read.

## Scope-First Context Flow

```text
User action
  -> Resolve Study Scope
  -> Apply metadata filters
  -> Choose context strategy
  -> Pack source-ordered passages or retrieve relevant passages
  -> Deduplicate and pack context
  -> Generate action-specific output
  -> Validate citations
  -> Save artifact with sourceRefs
```

## Chat Context Data Flow

```text
User chat message
  -> Chat planner / orchestrator
     - infer intent: casual chat, teacher mode, source preview, retrieval answer, save, quiz, cheat sheet, reader navigation
     - choose internal tools/APIs to call before generation
     - record a tool trace for debugging and future agent evaluation
  -> Conversation state
     - latest turns are preserved for follow-up references
     - older turns are compacted when context grows long
     - casual small talk stays in chat memory but is filtered out of retrieval queries
  -> Intent and study-goal extraction
     - free-form chat
     - fixed action pill mode
  -> Scope resolver
     - explicit selected folder, lecture, saved scope, or cited page
     - inferred course/lecture/topic from library metadata
     - fallback clarification when scope is ambiguous
  -> Optional source confirmation
     - skip when scope is explicit
     - recommend candidate folders, lectures, or page ranges when retrieval spans multiple plausible sources
     - let the student approve, remove, or adjust the recommended source set
  -> Context loader
     - natural-language query
     - optional rewritten query for lecture terminology
     - metadata filters by user, folder, lecture, page/slide, and status
     - lecture_pack for full lecture or page-by-page learning
     - broad coverage for exams and wide review
     - focused retrieval for local questions
     - long document map for large PDFs and papers
  -> Hybrid retriever when retrieval is the chosen strategy
     - vector search over Segment.embedding
     - keyword/lexical fallback
     - page or slide adjacency expansion
  -> Rerank, deduplicate, and pack context
  -> Prompt builder
     - instructions to use retrieved context as course grounding
     - permission to add clearly labeled general tutoring explanations
     - source ids visible to the model
  -> Streaming LLM response
  -> Citation validation
  -> Save message, retrieved refs, answer refs, and optional artifact
```

The chat response should stream token-by-token for the user, while the backend preserves the full trace of retrieved source references. This gives the product the familiar ChatGPT feeling without losing the source-grounded study workflow.

### Chat Planner / Internal Tools

StudyFlow should evolve from a single LLM call into a planner-led chat loop. The planner is responsible for talking with the user, inferring intent, choosing source scope, and calling internal StudyFlow APIs before generation. This gives the product MCP-like capability without exposing the whole app as external tools too early.

Initial internal tool surface:

- `library.catalog`: inspect the authenticated student's folder/file catalog, including folder names, course labels, file titles, file names, status, and passage counts.
- `scope.resolve`: decide the likely study scope from Library metadata before any passage retrieval runs.
- `source.preview`: recommend likely folders, lectures, pages, or materials for the current request.
- `rag.retrieve`: retrieve grounded context with user, folder, lecture, and page filters when focused or representative retrieval is the right context strategy.
- `context.pack`: package selected lecture/page content in source order when the student wants to learn a full lecture, every page, or a short complete source.
- `agent.teach`: delegate the final explanation, examples, quiz, or review flow to the teaching agent.
- `artifact.save`: save useful assistant outputs into Saved when the user asks or confirms.
- `library.manage`: future upload, move, rename, delete, and AI-assisted filing operations.
- `reader.open`: deep link into a cited source/page/passage.

The current implementation supports an optional AI planning agent before generation. When a chat model is configured, `planChatTurnWithAi` receives the user's recent conversation plus a compact authenticated Library catalog summary, then asks the planner model for a structured JSON plan covering intent, retrieval breadth, context strategy, delegated agent, confirmation needs, and rationale. The plan is validated against typed enums and then executed only through internal StudyFlow code paths. If the model is unavailable, malformed, or uncertain, the deterministic planner remains the fallback. The important product boundary is not a rigid execution script: the planner coordinates intent, Library scope, and internal tools, while the teaching agent owns the natural learning experience. Future versions can split it into specialized agents: planner, retrieval specialist, teacher, assessment coach, artifact curator, and library operator. The interface should remain tool-call shaped so this migration is incremental.

StudyFlow Chat should be source-aware, not source-imprisoned. Most conceptual explanation is general model capability: definitions, mental models, examples, analogies, and background should come from the model's normal tutoring ability unless the student explicitly asks to stay within the files. The student's materials are primarily used to choose the study scope, align with the course's wording/order, provide source-specific examples, and attach citations. Retrieved RAG context helps the model understand the student's course materials, terminology, and citation targets; it is not a hard ceiling on the model's tutoring ability. Source markers such as `[S1]` are reserved for specific source-supported claims, and the UI keeps a citation trace attached to the answer. The assistant must not fabricate citations or imply that general knowledge came from the student's files.

Source scope should be catalog-first, then strategy-specific context loading. The planner should not use embedding search to infer which files exist or which course the user means. It should first inspect the user's Library catalog and resolve likely folders/files from metadata such as `CSE 114A`, `lambda.pdf`, or manually selected sources. After scope is resolved, the planner chooses a context strategy:

- `lecture_pack`: for full-lecture, page-by-page, or short complete-source learning. The backend packs selected passages in document order so the model can teach the source coherently instead of seeing only a few similar passages.
- `focused_rag`: for specific questions, page references, definitions, or local confusion.
- `broad_rag`: for exams, quizzes, and broad review across a course/folder.
- `long_document_map`: for long papers or large PDFs where full packing would exceed useful context. The system uses representative coverage and later can add section-map summarization.

Current context budgets are strategy-specific: focused retrieval stays compact, broad review and long-document maps get larger representative coverage, and `lecture_pack` gets the largest ordered source budget. This is intentionally different from classic top-k retrieval because lecture teaching often needs continuity more than nearest-neighbor similarity.

Retrieval runs inside the resolved scope only when the chosen strategy needs retrieval. For broad requests like "help me review 114A for a midterm," the scope is usually the whole relevant course folder, while retrieved passages are representative samples for grounding. For "teach me every page of this lecture," the preferred strategy is `lecture_pack`, not top-k retrieval.

LangChain or LangGraph should be treated as an optional orchestration runtime, not the starting dependency. The MVP keeps planner outputs, internal tools, and agent roles as typed local contracts so they can be tested, traced, and changed quickly. If the agent loop grows into branching workflows with checkpoints, retries, human approval nodes, or multi-agent handoffs that are hard to maintain locally, these same contracts can be moved behind LangGraph-style nodes without rewriting the product model.

Conversation memory and retrieval memory are related but not identical. The assistant may use casual conversation history to sound natural and understand user preferences, but RAG retrieval should only expand the query with recent turns that contain concrete learning, source, file, concept, or assessment signals. This prevents greetings or unrelated chat from polluting source ranking while still supporting follow-up requests like "quiz me on that" after a Haskell discussion.

### Chat Interaction Rules

- Natural-language input is always available.
- Quick action pills are optional accelerators, not separate pages.
- A selected pill controls the output format of the next assistant response.
- Default free chat should feel like a teacher-led conversation: gradual explanation, short checks for what the student wants next, and no unsolicited quiz or cheat-sheet dump.
- The local deterministic fallback should follow the same teacher-led default so degraded mode does not become a template generator.
- The model should decide the teaching posture from the user's intent. When the student asks to learn from scratch, be taught page by page, or signals they are a beginner, the assistant should enter Teacher Mode: explain why the concept exists, build the mental model, teach details in order, give concrete examples, and end with a small understanding check.
- The assistant may ask one short source-confirmation question before generation when the scope is ambiguous.
- Source confirmation should be based on the internal retrieval/source-preview API or future tool calls, not a generic confirmation modal.
- In auto scope, the current Chat UI automatically runs source preview before sending when the request matches multiple likely materials, then lets the student approve or adjust the recommended sources.
- If the student chooses a scope manually, the assistant should not repeatedly ask for confirmation.
- Each answer should expose the sources it used and offer to open them in the reader.
- Saved answers should offer a continuation path back into Chat, prefilled with a useful follow-up prompt and locked to the original source scope when possible.
- The chat surface should feel conversational, not like a retrieval dashboard. Engineering details such as retrieval strategy ids should stay in traces, while the UI uses natural language like "I found likely materials."
- Streamed answers should be paced so they read like a live assistant response instead of instantly dumping a full generated block.
- Assistant Markdown should render as readable headings, lists, inline code, and code blocks.

## Ingestion Flow

```text
Upload file
  -> Validate type and size
  -> Store original in MinIO/S3
  -> Create Lecture record
  -> Parse content
  -> Build source passages by structure
  -> Save Segment records
  -> Generate embeddings
  -> Mark lecture processed
```

Current implementation note:

- PDF and TXT parsing now create real source segments.
- Upload processing can generate OpenAI embeddings when a real `OPENAI_API_KEY` is configured.
- Current Chat retrieval uses hybrid vector + lexical ranking when embeddings exist, with lexical fallback when vectors are missing.
- The schema already reserves `Segment.embedding` as a 1536-dimensional pgvector field.

## Passage Building Strategy

Passage building should preserve source fidelity before optimizing for AI generation.

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

Current retrieval:

- Filter by user and lecture.
- Generate a query embedding when embedding configuration is available.
- Retrieve pgvector nearest-neighbor results inside the authenticated user's lecture scope.
- Retrieve lexical keyword matches from the same user-scoped candidate set.
- Merge vector and lexical results into a hybrid ranked context and preserve each source ref's retrieval reason.
- When the user explicitly names a material/topic that matches a lecture title, retrieval and source preview first narrow to that lecture set. This keeps requests such as "teach me lambda" from drifting into unrelated Typeclass or Types material unless the model needs them as clearly labeled background.
- When the user asks for a specific page, exact page retrieval should take priority over semantic retrieval inside the selected or inferred lecture scope.
- Context strategy is an explicit planner decision. Focused factual questions use top relevant passages. Exam-prep requests use broad coverage across the selected material. Full-lecture, short-source, and page-by-page learning requests use lecture packing so the assistant can follow the source order instead of overfitting to a few passages. Long documents fall back to document-map style retrieval rather than blind full-source packing.
- Fall back to lexical/page-aware retrieval when embeddings are unavailable or provider calls fail.

Embedding retrieval constraints:

- Filter by user and study scope metadata.
- Search `Segment.embedding` through pgvector.
- Return top relevant segments with source metadata.
- Pack context with source ids visible to the prompt.

## Multi-Tenant RAG Isolation

StudyFlow should not create a separate physical vector database for every student in the MVP. The product uses shared PostgreSQL + pgvector infrastructure with tenant-scoped rows and mandatory ownership filters.

- `Folder`, `Lecture`, `Selection`, `ChatSession`, and `ChatMessage` are directly owned by `userId`.
- `Segment.embedding` is stored on the segment row, and segment ownership is inherited through `Lecture.userId`.
- Vector retrieval must join `segments` to `lectures` and filter `lectures.user_id = authenticated user id` before ordering by vector distance.
- Upload object keys are namespaced as `uploads/{userId}/...` so stored source files are separated by owner.
- Delete flows must remove the user-owned lecture, cascade its segments and embeddings, and remove the corresponding stored object.
- Production hardening should add PostgreSQL row-level security, tests for all raw SQL retrieval paths, and direct tenant indexes if query volume requires them.

Separate per-user vector databases are only justified for a future enterprise tier, regulatory hard isolation, or customer-managed storage. They are unnecessary overhead for the student SaaS MVP.

Embedding model target:

- Use `text-embedding-3-small` as the default OpenAI embedding model for MVP vector search.
- Keep `OPENAI_MODEL_EMBEDDING` configurable for future upgrades or provider swaps.
- Keep the vector dimension aligned with the database schema. The current schema expects 1536 dimensions, which matches `text-embedding-3-small`.

Advanced retrieval:

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
- Source-aware prompts should use Library context for scope, source order, course wording, examples, and citations, while still allowing general tutoring knowledge unless the student explicitly asks to stay within the files.
- Unsupported source claims should be omitted, marked uncertain, or left uncited.
