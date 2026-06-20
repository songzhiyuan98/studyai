# StudyFlow Roadmap

## Phase 1: Citation-First Study Loop

**Goal:** Build the smallest reliable student workflow: upload course material, parse it into source-aware segments, select a study scope, and perform small citation-backed AI actions.

### Implemented Foundation

- Account-based workspace.
- Folder/course-style organization.
- File upload to MinIO with database records.
- Real PDF/TXT parsing into source-aware passages.
- Library knowledge-base management with folders, list/grid/compact views, batch delete, and user-scoped cleanup.
- Reader source inspection with selectable passages and citation jump links.
- Saved archive for reusable generated outputs, with continuation back into Chat using the original source scope.

### Next

- Harden ingestion failures, duplicate handling, and reindex status for larger uploads.
- Add PPTX parsing as a separate parser milestone.
- Keep reader micro actions useful as inspection tools, while Chat remains the primary learning surface.
- Improve citation validation and unsupported-claim handling.

## Phase 2: Planner-Led Study Chat

**Goal:** Make the ChatGPT-like study assistant the core learning loop.

- Implemented: `/chat` page with focused composer, conversation stream, quick action pills, source preview, citations, reader links, and Saved-to-Chat continuation drafts.
- Implemented: Chat and Library as the primary post-login entries, with Saved as the secondary archive.
- Implemented: persisted chat sessions/messages and recent chat sidebar.
- Implemented: streaming answers through SSE with OpenAI chat generation when configured and local fallback streaming when not.
- Implemented: source confirmation for ambiguous or broad auto scopes, including lecture-pack and long-document strategies.
- Implemented: planner trace storage with intent, delegated agent, context strategy, source scope, and context coverage metadata.
- Next: improve long-term memory summaries, user preference memory, and follow-up actions such as "explain more simply", "translate this", and "save this as review notes".

## Phase 3: Context Quality

**Goal:** Move from basic context loading to student-grade, source-grounded teaching.

- Implemented: metadata-filtered retrieval by user, selected sources, inferred lecture titles, and page requests.
- Implemented: optional OpenAI embeddings, pgvector writes, reindex endpoint, lexical fallback, and hybrid vector/keyword retrieval.
- Implemented: planner-chosen context strategies:
  - `lecture_pack` for complete lecture or page-by-page teaching.
  - `focused_rag` for local questions.
  - `broad_rag` for exams and wide review.
  - `long_document_map` for large documents.
- Parent-child retrieval so small search passages retrieve larger page/slide context.
- MMR or equivalent context deduplication.
- Context packing by topic and source order.
- Citation validation for generated claims.
- Source jump links from generated artifacts back to lecture passages.

## Phase 3.5: Multi-Agent Orchestration

**Goal:** Keep the product flexible enough for real agentic workflows without adding orchestration weight too early.

- Current: local typed planner chooses intent, tools, delegated agent, context breadth, and context strategy.
- Current: teaching agent prompt owns natural explanation, examples, pacing, and follow-up style.
- Current: tool-shaped internal capabilities include catalog inspection, scope resolve, source preview, retrieval, artifact save, reader open, and confirmation-gated library management. Chat can draft upload/delete/rename/move requests, while Library prepares product-native confirmation modals for exact file matches instead of changing files silently.
- Next: add richer tool traces and explicit evaluation cases for planner decisions.
- Next: split specialized agents only where it improves product behavior:
  - planner/coordinator
  - retrieval/context specialist
  - teacher
  - assessment coach
  - artifact curator
  - library operator
- LangChain/LangGraph remains optional. Adopt it when checkpoints, retries, human approval nodes, or branching handoffs become harder to maintain in local typed code.

## Phase 4: Study Artifacts

**Goal:** Turn contextual interactions into reusable review materials.

- Saved study packs for midterm/final/chapter review.
- Flashcards generated from selected or retrieved passages.
- Printable cheat sheet generation with user constraints.
- Export to Markdown/PDF.
- Saved history for generated explanations, translations, quizzes, and cheat sheets, plus richer multi-output study packs.

## Phase 5: Exam and Feedback

**Goal:** Add larger assessment workflows after the RAG foundation is trustworthy.

- Exam blueprint builder.
- Multi-question mock exams based on selected study scopes.
- Grading rubrics for short answers.
- Evidence-backed explanations for answers.
- Weak-area summaries based on attempts.

## Deferred for Later

- Full teacher/instructor workflows.
- Classroom analytics.
- Complex review approval queues.
- Production billing and quota systems.
