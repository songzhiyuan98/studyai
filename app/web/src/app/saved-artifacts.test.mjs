import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('saved artifact deletes are scoped to the current user', () => {
  const routeSource = readFileSync(new URL('./api/study/actions/[id]/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /prisma\.item\.findFirst\(\{\s*where:\s*\{\s*id: params\.id,\s*selection:\s*\{\s*userId: session\.user\.id,/s);
  assert.match(routeSource, /tx\.item\.delete\(\{\s*where:\s*\{\s*id: item\.id,/s);
});

test('saved artifact delete removes an orphaned selection', () => {
  const routeSource = readFileSync(new URL('./api/study/actions/[id]/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /tx\.item\.count\(\{\s*where:\s*\{\s*selectionId: item\.selectionId,/s);
  assert.match(routeSource, /if \(remainingItems === 0\)/);
  assert.match(routeSource, /tx\.selection\.delete\(\{\s*where:\s*\{\s*id: item\.selectionId,/s);
});

test('chat save route reuses the shared artifact save helper', () => {
  const routeSource = readFileSync(new URL('./api/chat/save/route.ts', import.meta.url), 'utf8');
  const helperSource = readFileSync(new URL('../lib/chat-save-artifact.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /saveChatRequestSchema/);
  assert.match(routeSource, /saveChatRequestSchema\.safeParse/);
  assert.match(routeSource, /saveChatOutputAsArtifact/);
  assert.doesNotMatch(routeSource, /prisma\.item\.create/);
  assert.match(helperSource, /export async function saveChatOutputAsArtifact/);
  assert.match(helperSource, /generationMode = 'chat_retrieval_v0'/);
});

test('chat save route persists saved artifact state on the source chat message', () => {
  const routeSource = readFileSync(new URL('./api/chat/save/route.ts', import.meta.url), 'utf8');
  const chatPageSource = readFileSync(new URL('./chat/page.tsx', import.meta.url), 'utf8');
  const sessionRouteSource = readFileSync(new URL('./api/chat/sessions/[id]/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /chatMessageId: z\.string\(\)\.min\(1\)\.optional\(\)/);
  assert.match(routeSource, /id: parsed\.data\.chatMessageId/);
  assert.match(routeSource, /userId: session\.user\.id/);
  assert.match(routeSource, /role: 'ASSISTANT'/);
  assert.match(routeSource, /mergeSavedArtifactId\(chatMessage\.retrieval, artifact\.id\)/);
  assert.match(chatPageSource, /chatMessageId: chatMessage\.id/);
  assert.match(sessionRouteSource, /savedId: getSavedArtifactId\(message\.retrieval\)/);
});
