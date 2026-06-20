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

test('authenticated sidebar uses real recent chat sessions', () => {
  const source = readFileSync(resolve(root, 'src/components/app-shell.tsx'), 'utf8');
  assert.match(source, /\/api\/chat\/sessions/);
  assert.match(source, /studyflow:chat-sessions-changed/);
  assert.match(source, /href=\{`\/chat\?sessionId=\$\{chat\.id\}`\}/);
  assert.doesNotMatch(source, /Review Haskell functions/);
  assert.doesNotMatch(source, /Mini quiz from lambda notes/);
});

test('authenticated sidebar can delete chat sessions', () => {
  const source = readFileSync(resolve(root, 'src/components/app-shell.tsx'), 'utf8');
  assert.match(source, /setChatToDelete\(chat\)/);
  assert.match(source, /fetch\(`\/api\/chat\/sessions\/\$\{chatToDelete\.id\}`/);
  assert.match(source, /Delete this chat\?/);
  assert.match(source, /router\.push\('\/chat'\)/);
});

test('library page is positioned as knowledge base management', () => {
  const source = readFileSync(resolve(root, 'src/app/library/page.tsx'), 'utf8');
  assert.match(source, /Knowledge base/);
  assert.match(source, /Organize lecture files and folders/);
  assert.match(source, /'list', 'grid', 'compact'/);
});

test('saved page supports selecting and deleting saved outputs', () => {
  const source = readFileSync(resolve(root, 'src/app/review/page.tsx'), 'utf8');
  assert.match(source, /selectedArtifactIds/);
  assert.match(source, /Select visible outputs/);
  assert.match(source, /\/api\/study\/actions\/\$\{artifactId\}/);
  assert.match(source, /Delete saved outputs/);
});

test('lecture reindex API can backfill missing segment embeddings', () => {
  const source = readFileSync(resolve(root, 'src/app/api/lectures/reindex/route.ts'), 'utf8');
  assert.match(source, /s\.embedding IS NULL/);
  assert.match(source, /backfillSegmentEmbeddings/);
  assert.match(source, /user_id = \$\{session\.user\.id\}/);
});

test('chat page can refresh ready library sources after uploads finish indexing', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Refresh sources/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /hasHydratedSourcesRef/);
});

test('chat page defaults to auto scope instead of the first few sources', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Auto scope/);
  assert.match(source, /auto searches all ready sources/);
  assert.match(source, /Lock all sources/);
  assert.doesNotMatch(source, /loadedSources\.slice\(0,\s*3\)/);
});

test('chat page requests server-side streaming responses', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Accept: 'text\/event-stream'/);
  assert.match(source, /stream: true/);
  assert.match(source, /parseChatStreamEvent/);
});

test('chat input sends on enter and keeps shift enter for new lines', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /onKeyDown=\{\(event\) =>/);
  assert.match(source, /event\.key === 'Enter' && !event\.shiftKey/);
  assert.match(source, /event\.nativeEvent\.isComposing/);
  assert.match(source, /composerFormRef\.current\?\.requestSubmit\(\)/);
  assert.doesNotMatch(source, /sendMessage\(event\)/);
});

test('chat page can continue an existing chat session', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /useSearchParams/);
  assert.match(source, /requestedSessionId/);
  assert.match(source, /sessionId: activeSessionId \|\| undefined/);
  assert.match(source, /studyflow:chat-sessions-changed/);
});

test('chat citations open the cited reader segment', () => {
  const chatSource = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  const readerSource = readFileSync(resolve(root, 'src/app/documents/[id]/page.tsx'), 'utf8');

  assert.match(chatSource, /href=\{`\/documents\/\$\{source\.lectureId\}\?segmentId=\$\{encodeURIComponent\(source\.segmentId\)\}`\}/);
  assert.match(readerSource, /const citedSegmentId = searchParams\.get\('segmentId'\)/);
  assert.match(readerSource, /data-segment-id=\{segment\.id\}/);
  assert.match(readerSource, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
});

test('chat answers summarize the materials used for retrieval', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');

  assert.match(source, /function getUsedMaterials/);
  assert.match(source, /Used materials/);
  assert.match(source, /material\.count\} chunks/);
  assert.match(source, /chat-used-source-pill/);
});

test('chat page can preview suggested sources before generation', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');

  assert.match(source, /\/api\/chat\/preview/);
  assert.match(source, /Check sources/);
  assert.match(source, /Suggested materials/);
  assert.match(source, /Use these/);
  assert.match(source, /setConfirmedSources\(sourcePreview\.materials\.map/);
});

test('chat API loads recent session history before creating the next user message', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');
  const historyIndex = source.indexOf('await prisma.chatMessage.findMany');
  const createUserMessageIndex = source.indexOf("role: 'USER'");

  assert.ok(historyIndex > -1, 'chat route should load recent chat history');
  assert.ok(createUserMessageIndex > -1, 'chat route should persist user messages');
  assert.ok(historyIndex < createUserMessageIndex, 'history should exclude the new user message');
  assert.match(source, /orderBy:\s*\{\s*createdAt: 'desc'\s*\}/);
  assert.match(source, /take: 8/);
  assert.match(source, /history: recentHistory/);
});
