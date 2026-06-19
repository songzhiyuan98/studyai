# Real Reader Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the StudyFlow source loop by opening real uploaded lectures from Library into a reader backed by lecture and segment data.

**Architecture:** Add a lecture detail API under `/api/lectures/[id]` that enforces session ownership and returns folder plus ordered segments. Move reader formatting into a small testable helper, then make `/documents/[id]` load the real API with polished loading, error, empty, and selected-segment states.

**Tech Stack:** Next.js 14 App Router, React 18 client page, TypeScript, Prisma, Node test runner.

## Global Constraints

- Original lecture segments remain the source of truth.
- Generated content remains mock/placeholder in this milestone; do not implement LLM calls yet.
- All lecture reads must filter by authenticated user id.
- Keep UI desktop-first, restrained, and content-forward.

---

### Task 1: Reader Data Formatting

**Files:**
- Create: `app/web/src/lib/reader-format.ts`
- Create: `app/web/src/lib/reader-format.test.mjs`

**Interfaces:**
- `mapLectureDetailToReader(apiLecture): ReaderLecture`
- `formatSourceRef(segment): string`

- [x] Write failing tests for mapping lecture detail API data into reader title, metadata, ordered segments, and source refs.
- [x] Implement helper functions.
- [x] Run tests.

### Task 2: Lecture Detail API

**Files:**
- Create: `app/web/src/app/api/lectures/[id]/route.ts`

**Interfaces:**
- `GET /api/lectures/:id`
- Returns `{ success: true, data: { lecture } }` with folder and segments.
- Returns `401` when unauthenticated.
- Returns `404` when the lecture does not belong to the user.

- [x] Implement session check.
- [x] Query `prisma.lecture.findFirst({ where: { id, userId }, include: { folder, segments } })`.
- [x] Order segments by page, slide, charStart, createdAt.

### Task 3: Real Reader UI

**Files:**
- Modify: `app/web/src/app/documents/[id]/page.tsx`

**Interfaces:**
- Consumes `GET /api/lectures/:id`.
- Uses `mapLectureDetailToReader`.

- [x] Replace mock `documentData` with client fetch.
- [x] Add loading, error, and empty segment states.
- [x] Keep local selected segment state and micro action buttons.
- [x] Preserve polished desktop layout.

### Task 4: Verification

- [x] Run Node tests.
- [x] Run `pnpm --filter @study-assistant/web type-check`.
- [x] Browser verify Library -> Reader with an existing uploaded lecture or empty fallback.
- [x] Commit and push.
