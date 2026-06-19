# StudyFlow Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the product as StudyFlow, a citation-first student study workspace, then repair the current frontend/auth issues and refresh the UI around small, contextual AI study actions.

**Architecture:** Keep the existing Next.js monorepo and Prisma data model. Treat original lecture segments as the source of truth; RAG, translation, summaries, quizzes, and future cheat sheets are generated artifacts linked to source refs.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, NextAuth, Prisma, PostgreSQL/pgvector, MinIO.

## Global Constraints

- Do not implement large backend RAG features in this pass; document the architecture and build frontend surfaces that support the intended workflow.
- Keep UI restrained, content-first, and student-tool oriented; remove decorative emoji-heavy AI marketing treatment.
- Fix known frontend safety issues before adding new UI polish.
- Use tests before production code for behavior fixes where feasible.

---

### Task 1: Product Docs and Naming

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/API.md`
- Modify: `docs/CHANGELOG.md`
- Modify: `app/web/src/app/layout.tsx`

**Interfaces:**
- Produces the product language used by frontend pages: `StudyFlow`, "citation-first study workspace", "micro AI actions", "study scope".

- [ ] Update documentation to describe StudyFlow as a student-owned lecture workspace.
- [ ] Document MVP scope: upload, parse, source-aware chunks, reader selection, micro actions, citation-backed outputs.
- [ ] Document RAG architecture: source anchors, study scopes, metadata-filtered retrieval, context packaging, citation validation.
- [ ] Add cheat sheet to roadmap as a later generated artifact, not an MVP blocker.

### Task 2: Auth Safety and Runtime Error Tests

**Files:**
- Create: `app/web/src/lib/callback-url.ts`
- Create: `app/web/src/lib/callback-url.test.mjs`
- Create: `app/web/src/app/client-pages.test.mjs`
- Modify: `app/web/src/app/login/page.tsx`
- Modify: `app/web/src/app/documents/[id]/page.tsx`
- Modify: `app/web/src/app/exam/[id]/page.tsx`

**Interfaces:**
- `sanitizeCallbackUrl(input: string | null | undefined): string`
  - Returns a same-origin relative path.
  - Falls back to `/dashboard` for absolute URLs, protocol-relative URLs, empty strings, and malformed values.

- [ ] Write failing tests for callback URL sanitization.
- [ ] Write failing static tests proving interactive dynamic pages are client components.
- [ ] Run tests and confirm failures.
- [ ] Implement `sanitizeCallbackUrl`.
- [ ] Use sanitized callback URLs in login and Google login.
- [ ] Mark interactive reader/exam pages as client components.
- [ ] Verify tests pass.

### Task 3: Restrained UI System

**Files:**
- Modify: `app/web/src/app/globals.css`
- Modify: `app/web/src/components/navigation.tsx`
- Modify: `app/web/src/app/layout.tsx`

**Interfaces:**
- Shared classes: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`, `.chip`, `.page-shell`, `.page-header`, `.section-title`.

- [ ] Replace green/emoji/marketing-heavy treatment with neutral tool styling.
- [ ] Use blue only as functional accent.
- [ ] Keep cards light, 8px radius or less, and avoid nested card-heavy layouts.
- [ ] Improve navigation labels around student workflow: Workspace, Library, Upload, Study, Review.

### Task 4: Student Study Workspace UI

**Files:**
- Modify: `app/web/src/app/page.tsx`
- Modify: `app/web/src/app/dashboard/page.tsx`
- Modify: `app/web/src/app/library/page.tsx`
- Modify: `app/web/src/app/upload/page.tsx`
- Modify: `app/web/src/app/study/page.tsx`
- Modify: `app/web/src/app/review/page.tsx`
- Modify: `app/web/src/app/login/page.tsx`
- Modify: `app/web/src/app/register/page.tsx`
- Modify: `app/web/src/app/documents/[id]/page.tsx`
- Modify: `app/web/src/app/exam/[id]/page.tsx`

**Interfaces:**
- Frontend copy introduces `Study Scope`, `Source refs`, and `Micro actions`.
- Reader page surfaces micro actions: Explain, Summarize, Translate, Key Terms, Mini Quiz.
- Study page surfaces scope-based workflows and future cheat sheet concept.

- [ ] Refresh homepage as product entry, not a decorative AI landing page.
- [ ] Refresh dashboard as an active workspace overview.
- [ ] Refresh library/upload to feel like course material management.
- [ ] Refresh study/review as saved artifacts and scoped study actions.
- [ ] Repair reader and exam pages enough to render cleanly.
- [ ] Remove excessive decorative emoji icons and reduce visual noise.

### Task 5: Verification, Commit, Push

**Files:**
- All touched files.

- [ ] Run unit/static tests.
- [ ] Run type-check or targeted build where feasible.
- [ ] Run browser checks for login, dashboard, reader, exam.
- [ ] Commit with a concise product-refresh message.
- [ ] Push to GitHub after verification.
