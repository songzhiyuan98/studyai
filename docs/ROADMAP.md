# StudyFlow Roadmap

## Phase 1: Citation-First Study Loop

**Goal:** Build the smallest reliable student workflow: upload course material, parse it into source-aware segments, select a study scope, and perform small citation-backed AI actions.

### In Progress

- Account-based workspace.
- Folder/course-style organization.
- File upload to MinIO with database records.
- Basic reader, library, upload, review, and study pages.

### Next

- Replace mock parsing with real TXT and PDF parsing.
- Implement structure-aware chunking with stable `Segment` source metadata.
- Build a working lecture reader backed by database data.
- Add segment selection and saved study scope state.
- Add embeddings for segments and pgvector retrieval inside the selected scope.
- Implement micro actions: Explain, Summarize, Translate, Key Terms, Mini Quiz.
- Store generated artifacts with `sourceRefs`.

## Phase 2: RAG Quality

**Goal:** Move from basic retrieval to student-grade, source-grounded RAG.

- Metadata-filtered retrieval by user, course/folder, lecture, page/slide, and saved scope.
- Hybrid search combining keyword and vector retrieval.
- Parent-child retrieval so small chunks retrieve larger page/slide context.
- MMR or equivalent context deduplication.
- Context packing by topic and source order.
- Citation validation for generated claims.
- Source jump links from generated artifacts back to lecture segments.

## Phase 3: Study Artifacts

**Goal:** Turn contextual interactions into reusable review materials.

- Saved study packs for midterm/final/chapter review.
- Flashcards generated from selected or retrieved segments.
- Printable cheat sheet generation with user constraints.
- Export to Markdown/PDF.
- Review history for generated explanations, translations, and quizzes.

## Phase 4: Exam and Feedback

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
