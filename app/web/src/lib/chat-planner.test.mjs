import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(new URL('../..', import.meta.url).pathname);

test('chat planner exposes internal tool-shaped planning decisions', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /export function planChatTurn/);
  assert.match(source, /ChatPlannerToolName/);
  assert.match(source, /'source\.preview'/);
  assert.match(source, /'rag\.retrieve'/);
  assert.match(source, /'artifact\.save'/);
  assert.match(source, /'reader\.open'/);
  assert.match(source, /'library\.manage'/);
  assert.match(source, /teacherModeHint/);
  assert.match(source, /requestedPage/);
  assert.match(source, /requiresConfirmation/);
});

test('chat route stores planner trace with retrieval metadata', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /planChatTurn/);
  assert.match(source, /const chatPlan = planChatTurn/);
  assert.match(source, /shouldRetrieveSources = chatPlan\.requiresRetrieval/);
  assert.match(source, /plan: chatPlan/);
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
