# Study Actions Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn selected reader segments into a concrete study scope and let micro action buttons create source-backed placeholder artifacts.

**Architecture:** Reuse the existing `Selection` and `Item` tables instead of adding schema. Add a small tested study-action formatting module, a session-protected `POST /api/study/actions` route, and reader UI state for action submission and artifact display. The route will save deterministic placeholder content now, while preserving the request/response shape needed for later RAG retrieval and LLM generation.

**Tech Stack:** Next.js 14 App Router, React 18 client page, TypeScript, Prisma, Zod, Node test runner.

## Global Constraints

- No real LLM calls in this milestone.
- All segment, lecture, selection, and item operations must filter by authenticated user id.
- Generated artifacts must include source references pointing back to original segment ids.
- Keep the reader interaction small and in-place, not a “click once and dump a huge page” workflow.
- Do not change the Prisma schema in this milestone.

---

### Task 1: Study Action View Model

**Files:**
- Create: `app/web/src/lib/study-actions.ts`
- Create: `app/web/src/lib/study-actions.test.mjs`

**Interfaces:**
- `studyActions`: readonly action definitions with ids `explain`, `summarize`, `key_terms`, `mini_quiz`, `cheat_sheet`
- `formatStudyActionTitle(actionId, segmentCount): string`
- `buildPlaceholderArtifact({ action, segmentTexts, sourceRefs }): StudyArtifact`

- [x] Write failing tests for action title formatting and placeholder artifact output.
- [x] Run `node --experimental-strip-types --test app/web/src/lib/study-actions.test.mjs` and confirm it fails because the module is missing.
- [x] Implement the helper functions and exported types.
- [x] Run the focused test and confirm it passes.

### Task 2: Study Action API

**Files:**
- Create: `app/web/src/app/api/study/actions/route.ts`

**Interfaces:**
- `POST /api/study/actions`
- Request: `{ lectureId: string, segmentIds: string[], action: StudyActionId, instructions?: string }`
- Response: `{ success: true, data: { artifact } }`

- [x] Validate session, request body, lecture ownership, and selected segment ownership through the lecture.
- [x] Create a `Selection` row with `userId`, `lectureId`, and ordered `segmentIds`.
- [x] Create an `Item` row with mapped `ItemType`, placeholder `payloadJson`, and `sourceRefs`.
- [x] Return the artifact shape used by the reader UI.

### Task 3: Reader Action UI

**Files:**
- Modify: `app/web/src/app/documents/[id]/page.tsx`

**Interfaces:**
- Consumes `studyActions`
- Calls `POST /api/study/actions`
- Renders returned artifacts in the existing right-side Study output panel

- [x] Replace hard-coded micro action labels with `studyActions`.
- [x] Add submitting state keyed by action id.
- [x] Disable actions when no source segment is selected.
- [x] Append returned artifact cards with type, title, content, and source reference chips.
- [x] Show concise inline errors without blocking reading.

### Task 4: Docs and Verification

**Files:**
- Modify: `docs/API.md`

- [x] Move `POST /api/study/actions` from planned to current behavior and document placeholder generation.
- [x] Run all Node tests.
- [x] Run `pnpm --filter @study-assistant/web type-check`.
- [x] Browser verify a real reader page: select segments, run a micro action, confirm a source-backed artifact appears.
- [x] Commit and push.
