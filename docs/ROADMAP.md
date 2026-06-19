# StudyFlow Roadmap

## Phase 1: Citation-First Study Loop

**Goal:** Build the smallest reliable student workflow: upload course material, parse it into source-aware segments, select a study scope, and perform small citation-backed AI actions.

### In Progress

- Account-based workspace.
- Folder/course-style organization.
- File upload to MinIO with database records.
- Basic reader, library, upload, review, and study pages.

### Next

- Finish real TXT/PDF ingestion hardening and move PPTX to a separate parser milestone.
- Add embeddings for segments and pgvector retrieval inside selected scopes.
- Build the first library-grounded chat surface with streaming answers and citations.
- Implement chat scope resolution from folders, lectures, pages, and natural-language topics.
- Preserve reader micro actions: Explain, Summarize, Key Terms, Mini Quiz, Cheat Sheet draft.
- Store generated artifacts with selected `sourceRefs` and retrieved `relatedRefs`.

## Phase 2: Library-Grounded Chat

**Goal:** Make the ChatGPT-like study assistant the core learning loop.

- `/chat` page with a focused composer and conversation stream.
- Chat and Library as the two primary post-login entries, with Saved as a secondary archive.
- Logged-in left app sidebar instead of a top navigation bar.
- Chat history in the app sidebar while inside `/chat`.
- Opening prompt: "What do you want to study today?"
- Scope chips for folder, lecture, saved scope, current reader source, and recent uploads.
- Quick action pills above the composer: Explain, Summarize, Key terms, Mini quiz, Cheat sheet.
- Source confirmation step when the assistant detects multiple likely folders, lectures, or page ranges.
- Streaming answers backed by retrieved library context.
- Citations that open the reader at the relevant segment or page.
- Follow-up actions: explain more simply, translate this, quiz me, summarize this topic, make cheat sheet draft.
- Conversation state that keeps the current study goal without leaking across unrelated courses.

## Phase 3: RAG Quality

**Goal:** Move from basic retrieval to student-grade, source-grounded RAG.

- Metadata-filtered retrieval by user, course/folder, lecture, page/slide, and saved scope.
- Hybrid search combining keyword and vector retrieval.
- Parent-child retrieval so small chunks retrieve larger page/slide context.
- MMR or equivalent context deduplication.
- Context packing by topic and source order.
- Citation validation for generated claims.
- Source jump links from generated artifacts back to lecture segments.

## Phase 4: Study Artifacts

**Goal:** Turn contextual interactions into reusable review materials.

- Saved study packs for midterm/final/chapter review.
- Flashcards generated from selected or retrieved segments.
- Printable cheat sheet generation with user constraints.
- Export to Markdown/PDF.
- Saved history for generated explanations, translations, quizzes, and cheat sheets.

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
