import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(new URL('../..', import.meta.url).pathname);

test('chat planner exposes internal tool-shaped planning decisions', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /export function planChatTurn/);
  assert.match(source, /ChatPlannerToolName/);
  assert.match(source, /'library\.catalog'/);
  assert.match(source, /'scope\.resolve'/);
  assert.match(source, /'source\.preview'/);
  assert.match(source, /'rag\.retrieve'/);
  assert.match(source, /'agent\.teach'/);
  assert.match(source, /'artifact\.save'/);
  assert.match(source, /'reader\.open'/);
  assert.match(source, /'library\.manage'/);
  assert.match(source, /teacherModeHint/);
  assert.match(source, /delegatedAgent/);
  assert.match(source, /retrievalBreadth/);
  assert.match(source, /requestedPage/);
  assert.match(source, /requiresConfirmation/);
});

test('chat planner models broad assessment generation separately from focused retrieval', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /assessment_generation/);
  assert.match(source, /hasAssessmentIntent/);
  assert.match(source, /broad_assessment/);
  assert.match(source, /broad_lesson/);
  assert.match(source, /要考\|备考/);
  assert.match(source, /representative coverage across the selected course materials/);
  assert.match(source, /broad coverage across the selected lecture or topic/);
});

test('chat planner resolves library scope before retrieval and agent response', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /Inspect the student’s Library folders and files before deciding source scope/);
  assert.match(source, /Resolve the source scope from Library metadata before retrieving chunks/);
  assert.match(source, /Delegate final response to the teaching agent/);
});

test('chat route stores planner trace with retrieval metadata', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /planChatTurn/);
  assert.match(source, /const chatPlan = planChatTurn/);
  assert.match(source, /shouldRetrieveSources = chatPlan\.requiresRetrieval/);
  assert.match(source, /plan: chatPlan/);
  assert.match(source, /resolvedScope/);
  assert.match(source, /libraryScope\.matchedLabels/);
});

test('chat route can call the artifact save tool from planner intent', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /chatPlan\.intent === 'save_request'/);
  assert.match(source, /parseChatSourceRefs/);
  assert.match(source, /saveChatOutputSchema\.safeParse/);
  assert.match(source, /saveChatOutputAsArtifact/);
  assert.match(source, /tool_artifact_save_v0/);
  assert.match(source, /chat_planner_artifact_save_v0/);
});

test('chat route can return reader links from planner intent', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /chatPlan\.intent === 'reader_navigation'/);
  assert.match(source, /tool_reader_open_v0/);
  assert.match(source, /parseChatSourceRefs\(assistantMessage\.sourceRefs\)/);
  assert.match(source, /sourceRef\.page === chatPlan\.requestedPage/);
  assert.match(source, /reader_link_ready/);
  assert.match(source, /Open it from the citation below/);
});
