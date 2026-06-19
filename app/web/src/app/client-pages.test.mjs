import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(new URL('../..', import.meta.url).pathname);
const pages = [
  'src/app/documents/[id]/page.tsx',
  'src/app/exam/[id]/page.tsx',
];

test('interactive dynamic pages are client components', () => {
  for (const page of pages) {
    const source = readFileSync(resolve(root, page), 'utf8').trimStart();
    assert.match(source, /^['"]use client['"];?/, `${page} must start with 'use client'`);
  }
});

test('login form does not expose credentials to native query-string submission', () => {
  const source = readFileSync(resolve(root, 'src/app/login/page.tsx'), 'utf8');
  assert.doesNotMatch(source, /name=["']email["']/);
  assert.doesNotMatch(source, /name=["']password["']/);
});
