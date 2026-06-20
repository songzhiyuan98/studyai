import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('chat vector retrieval is scoped to the authenticated user', () => {
  const routeSource = readFileSync(new URL('./api/chat/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /JOIN lectures l ON l\.id = s\.lecture_id/);
  assert.match(routeSource, /WHERE l\.user_id = \$\{userId\}/);
  assert.match(routeSource, /AND l\.status = 'PROCESSED'/);
});

test('lecture uploads store objects under a user-scoped key prefix', () => {
  const routeSource = readFileSync(new URL('./api/lectures/route.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /uploads\/\$\{session\.user\.id\}\//);
});

test('lecture deletes are user-scoped and cascade segment embeddings', () => {
  const routeSource = readFileSync(new URL('./api/lectures/[id]/route.ts', import.meta.url), 'utf8');
  const schemaSource = readFileSync(new URL('../../../../packages/db/prisma/schema.prisma', import.meta.url), 'utf8');

  assert.match(routeSource, /prisma\.lecture\.findFirst\(\{\s*where:\s*\{\s*id: params\.id,\s*userId: session\.user\.id,/s);
  assert.match(routeSource, /prisma\.lecture\.delete\(\{\s*where:\s*\{\s*id: params\.id,/s);
  assert.match(routeSource, /deleteStoredLectureObject\(lecture\.fileKey\)/);
  assert.match(schemaSource, /lecture Lecture @relation\(fields: \[lectureId\], references: \[id\], onDelete: Cascade\)/);
});
