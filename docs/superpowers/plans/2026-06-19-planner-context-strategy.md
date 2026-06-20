# Planner Context Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chat planner choose how to package learning context instead of always sending a few RAG chunks.

**Architecture:** Add a typed `contextStrategy` to planner output. Implement a deterministic `lecture_pack` helper that packs selected lecture/page content in source order for full-lecture and page-by-page learning. Keep focused and broad RAG for specific questions, exams, and long documents.

**Tech Stack:** Next.js route handlers, TypeScript helpers, Prisma lecture/segment data, Node test runner with `--experimental-strip-types`.

## Global Constraints

- User data remains scoped by authenticated `userId`.
- RAG remains a tool, not the planner.
- Lecture learning requests should preserve document order and page context.
- Long documents should avoid blindly packing the entire source into model context.
- Each functional change must be tested, committed, and pushed.

---

### Task 1: Planner Strategy

**Files:**
- Modify: `app/web/src/lib/chat-planner.ts`
- Modify: `app/web/src/lib/chat-planner.test.mjs`

**Interfaces:**
- Produces: `contextStrategy: 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map'`

- [ ] **Step 1: Write failing planner tests**

Add assertions that `chat-planner.ts` exports `contextStrategy`, mentions `lecture_pack`, and selects different context strategies for full-lecture learning versus assessment.

- [ ] **Step 2: Run planner tests and verify failure**

Run: `node --experimental-strip-types --test app/web/src/lib/chat-planner.test.mjs`
Expected: FAIL because `contextStrategy` and `lecture_pack` do not exist.

- [ ] **Step 3: Implement planner strategy**

Add `contextStrategy` to `ChatTurnPlan`. Use `lecture_pack` for teacher-mode full-lecture or page-by-page requests, `broad_rag` for assessments, `focused_rag` for specific questions, and reserve `long_document_map` for long document metadata.

- [ ] **Step 4: Run planner tests and verify pass**

Run: `node --experimental-strip-types --test app/web/src/lib/chat-planner.test.mjs`
Expected: PASS.

### Task 2: Lecture Pack Context Builder

**Files:**
- Create: `app/web/src/lib/lecture-pack.ts`
- Create: `app/web/src/lib/lecture-pack.test.mjs`

**Interfaces:**
- Consumes: retrieval-like segments `{ id, lectureId, text, page, slide, charStart, charEnd }`
- Produces: `buildLecturePackContext({ candidateSegments, maxChars }): { contextText, segments }`

- [ ] **Step 1: Write failing lecture pack tests**

Test that segments are grouped and packed in page/source order, preserve multiple pages, and respect a character budget.

- [ ] **Step 2: Run lecture pack tests and verify failure**

Run: `node --experimental-strip-types --test app/web/src/lib/lecture-pack.test.mjs`
Expected: FAIL because file does not exist.

- [ ] **Step 3: Implement lecture pack helper**

Create `buildLecturePackContext` with stable ordering and page labels.

- [ ] **Step 4: Run lecture pack tests and verify pass**

Run: `node --experimental-strip-types --test app/web/src/lib/lecture-pack.test.mjs`
Expected: PASS.

### Task 3: Chat Route Integration

**Files:**
- Modify: `app/web/src/app/api/chat/route.ts`
- Modify: `app/web/src/app/chat-preview.test.mjs`
- Modify: `app/web/src/lib/chat-planner.test.mjs`

**Interfaces:**
- Consumes: `chatPlan.contextStrategy`
- Produces: retrieval trace with `contextStrategy`

- [ ] **Step 1: Write failing route tests**

Assert route imports lecture pack helper, uses `chatPlan.contextStrategy`, and stores `contextStrategy` in retrieval trace.

- [ ] **Step 2: Run route tests and verify failure**

Run: `node --experimental-strip-types --test app/web/src/lib/chat-planner.test.mjs app/web/src/app/chat-preview.test.mjs`
Expected: FAIL before route integration.

- [ ] **Step 3: Implement route integration**

For `lecture_pack`, build context from ordered lecture segments instead of top RAG hits. For other strategies keep current RAG behavior.

- [ ] **Step 4: Run route tests and verify pass**

Run: `node --experimental-strip-types --test app/web/src/lib/chat-planner.test.mjs app/web/src/app/chat-preview.test.mjs`
Expected: PASS.

### Task 4: Documentation and Full Verification

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CHAT_CONTEXT_TODO.md`

**Interfaces:**
- Documents planner-first context strategy.

- [ ] **Step 1: Update docs**

Document that Planner chooses between lecture pack, focused RAG, broad RAG, and long document map.

- [ ] **Step 2: Run full relevant verification**

Run: `pnpm --filter @study-assistant/web type-check`
Run relevant Node tests including new lecture pack tests.

- [ ] **Step 3: Commit and push**

Commit with message `Add planner context strategy`.
