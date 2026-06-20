import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('chat source preview retrieval is scoped to the current user', () => {
  const routeSource = readFileSync(new URL('./api/chat/preview/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /JOIN lectures l ON l\.id = s\.lecture_id/);
  assert.match(routeSource, /WHERE l\.user_id = \$\{userId\}/);
  assert.match(routeSource, /userId: session\.user\.id/);
  assert.doesNotMatch(routeSource, /prisma\.chatMessage\.create/);
});

test('chat source preview returns suggested materials without generation', () => {
  const routeSource = readFileSync(new URL('./api/chat/preview/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /materials: Array\.from\(materialMap\.values\(\)\)/);
  assert.match(routeSource, /hybrid_vector_lexical_v0/);
  assert.doesNotMatch(routeSource, /generateGroundedChatAnswer/);
});

test('chat source preview uses selected chat mode for planning breadth', () => {
  const routeSource = readFileSync(new URL('./api/chat/preview/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /mode: z\.enum/);
  assert.match(routeSource, /mode: parsed\.data\.mode/);
  assert.match(routeSource, /broad_lesson_v0/);
  assert.match(routeSource, /broad_assessment_v0/);
});

test('chat source preview resolves scope from the library catalog before chunk retrieval', () => {
  const routeSource = readFileSync(new URL('./api/chat/preview/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /resolveLibraryScope/);
  assert.match(routeSource, /originalName: true/);
  assert.match(routeSource, /courseId: true/);
  assert.match(routeSource, /libraryScope/);
});
