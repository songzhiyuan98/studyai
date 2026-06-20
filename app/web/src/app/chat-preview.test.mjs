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
