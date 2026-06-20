import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('chat session delete is scoped to the current user', () => {
  const routeSource = readFileSync(new URL('./api/chat/sessions/[id]/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /export async function DELETE/);
  assert.match(routeSource, /prisma\.chatSession\.findFirst\(\{\s*where:\s*\{\s*id: params\.id,\s*userId: session\.user\.id,/s);
  assert.match(routeSource, /prisma\.chatSession\.delete\(\{\s*where:\s*\{\s*id: chatSession\.id,/s);
});

test('chat messages cascade when a chat session is deleted', () => {
  const schemaSource = readFileSync(new URL('../../../../packages/db/prisma/schema.prisma', import.meta.url), 'utf8');

  assert.match(schemaSource, /session ChatSession @relation\(fields: \[sessionId\], references: \[id\], onDelete: Cascade\)/);
});
