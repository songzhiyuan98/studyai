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

test('root layout delegates authenticated chrome to AppShell', () => {
  const source = readFileSync(resolve(root, 'src/app/layout.tsx'), 'utf8');
  assert.match(source, /import \{ AppShell \} from ['"]\.\.\/components\/app-shell['"]/);
  assert.match(source, /<AppShell>\s*\{children\}\s*<\/AppShell>/);
  assert.doesNotMatch(source, /<header className=/);
  assert.doesNotMatch(source, /<footer className=/);
});

test('authenticated navigation is focused on chat library and saved', () => {
  const source = readFileSync(resolve(root, 'src/components/app-shell.tsx'), 'utf8');
  assert.match(source, /\{ href: ['"]\/chat['"], label: ['"]Chat['"] \}/);
  assert.match(source, /\{ href: ['"]\/library['"], label: ['"]Library['"] \}/);
  assert.match(source, /\{ href: ['"]\/saved['"], label: ['"]Saved['"]/);
  assert.doesNotMatch(source, /\{ href: ['"]\/study['"], label: ['"]Study['"] \}/);
  assert.doesNotMatch(source, /\{ href: ['"]\/review['"], label: ['"]Review['"] \}/);
});

test('library page is positioned as knowledge base management', () => {
  const source = readFileSync(resolve(root, 'src/app/library/page.tsx'), 'utf8');
  assert.match(source, /Knowledge base/);
  assert.match(source, /Organize lecture files and folders/);
  assert.match(source, /'list', 'grid', 'compact'/);
});

test('chat page can refresh ready library sources after uploads finish indexing', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Refresh sources/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /hasHydratedSourcesRef/);
});

test('chat page requests server-side streaming responses', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Accept: 'text\/event-stream'/);
  assert.match(source, /stream: true/);
  assert.match(source, /parseChatStreamEvent/);
});
