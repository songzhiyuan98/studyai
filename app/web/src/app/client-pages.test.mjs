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
  assert.match(source, /needsVectorReindex/);
  assert.match(source, /Reindex vectors/);
  assert.match(source, /\/api\/lectures\/reindex/);
  assert.match(source, /Vector ready/);
});

test('saved page supports selecting and deleting saved outputs', () => {
  const source = readFileSync(resolve(root, 'src/app/review/page.tsx'), 'utf8');
  assert.match(source, /selectedArtifactIds/);
  assert.match(source, /Select visible outputs/);
  assert.match(source, /\/api\/study\/actions\/\$\{artifactId\}/);
  assert.match(source, /Delete saved outputs/);
  assert.match(source, /href=\{`\/documents\/\$\{ref\.lectureId\}\?segmentId=\$\{encodeURIComponent\(ref\.segmentId\)\}`\}/);
});

test('lecture reindex API can backfill missing segment embeddings', () => {
  const source = readFileSync(resolve(root, 'src/app/api/lectures/reindex/route.ts'), 'utf8');
  assert.match(source, /s\.embedding IS NULL/);
  assert.match(source, /backfillSegmentEmbeddings/);
  assert.match(source, /user_id = \$\{session\.user\.id\}/);
  assert.match(source, /totalMissingSegmentCount/);
  assert.match(source, /remainingSegmentCount: readCount\(remainingCountRows\)/);
  assert.match(source, /COUNT\(\*\)::bigint as count/);
  assert.match(source, /syncLectureEmbeddingMeta/);
  assert.match(source, /COUNT\(s\.embedding\)::bigint as embedded_segment_count/);
  assert.match(source, /syncedLectureCount/);
});

test('chat page can refresh ready library sources after uploads finish indexing', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  const routeSource = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /Refresh/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /hasHydratedSourcesRef/);
  assert.match(source, /vectorStatus\?: string/);
  assert.match(routeSource, /getChatSourceVectorStatus/);
  assert.match(routeSource, /Vector ready/);
  assert.match(routeSource, /Lexical ready/);
});

test('chat page defaults to auto scope instead of the first few sources', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Auto scope/);
  assert.match(source, /Using auto source search/);
  assert.match(source, /I will search all ready Library materials/);
  assert.match(source, /Lock all/);
  assert.doesNotMatch(source, /loadedSources\.slice\(0,\s*3\)/);
});

test('chat page requests server-side streaming responses', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  assert.match(source, /Accept: 'text\/event-stream'/);
  assert.match(source, /stream: true/);
  assert.match(source, /parseChatStreamEvent/);
});

test('chat API paces streamed answer deltas instead of dumping content instantly', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');
  assert.match(source, /CHAT_STREAM_DELAY_MS = 28/);
  assert.match(source, /waitForChatStreamPace/);
  assert.match(source, /await waitForChatStreamPace\(\);\s*controller\.enqueue\(encodeSseEvent\('delta'/);
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

  assert.match(source, /contextStrategy\?:/);
  assert.match(source, /function getUsedMaterials/);
  assert.match(source, /function getContextStrategyLabel/);
  assert.match(source, /function getPlannerSourceLabel/);
  assert.match(source, /Used materials/);
  assert.match(source, /AI planner/);
  assert.match(source, /deterministic fallback/);
  assert.match(source, /lecture pack/);
  assert.match(source, /document map/);
  assert.match(source, /material\.count\} chunks/);
  assert.match(source, /chat-used-source-pill/);
});

test('chat keeps streaming answers conversational before showing metadata actions', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  const styles = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');

  assert.match(source, /function renderInlineMarkdown/);
  assert.match(source, /function shouldShowMessageTitle/);
  assert.match(source, /chatMessage\.title !== 'Study answer'/);
  assert.match(source, /Thinking\.\.\./);
  assert.match(source, /className="chat-markdown"/);
  assert.match(source, /!chatMessage\.isStreaming && chatMessage\.content\.trim\(\) && chatMessage\.sourceRefs\?\.length/);
  assert.match(source, /sending && !hasStreamingAssistant/);
  assert.match(styles, /\.chat-markdown pre/);
});

test('chat page can preview suggested sources before generation', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');

  assert.match(source, /\/api\/chat\/preview/);
  assert.match(source, /requestSourcePreview/);
  assert.match(source, /Check sources/);
  assert.match(source, /Suggested materials/);
  assert.match(source, /mode,/);
  assert.match(source, /Suggested study scope/);
  assert.match(source, /libraryScope/);
  assert.match(source, /contextStrategy\?:/);
  assert.match(source, /sourcePreview\?\.retrieval\.contextStrategy === 'lecture_pack'/);
  assert.match(source, /sourceScopeLabel/);
  assert.match(source, /study scope/);
  assert.match(source, /sourcePreviewGroundingLabel/);
  assert.match(source, /source-order lecture pack/);
  assert.match(source, /indexed chunks/);
  assert.match(source, /sourcePreviewDescription/);
  assert.match(source, /sourcePreviewReason/);
  assert.match(source, /Why this scope/);
  assert.match(source, /sourcePreview\?\.retrieval\.plannerRationale/);
  assert.match(source, /sourcePreview\?\.retrieval\.libraryScope\?\.reason/);
  assert.match(source, /plannerSource\?:/);
  assert.match(source, /getPlannerSourceLabel\(sourcePreview\?\.retrieval\.plannerSource\)/);
  assert.match(source, /selectedPreviewLectureIds/);
  assert.match(source, /Use selected/);
  assert.match(source, /togglePreviewMaterial/);
  assert.match(source, /selectAllPreviewMaterials/);
  assert.match(source, /clearPreviewMaterials/);
  assert.match(source, /setConfirmedSources\(selectedPreviewLectureIds\)/);
  assert.match(source, /setSourcePreview\(null\)/);
  assert.doesNotMatch(source, /setConfirmedSources\(sourcePreview\.materials\.map/);
});

test('chat send automatically asks for source confirmation on ambiguous auto scope', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');
  const confirmationIndex = source.indexOf('const shouldConfirmSourcesBeforeSend');
  const userMessageIndex = source.indexOf('const userMessage: ChatMessage');

  assert.match(source, /const shouldConfirmSourcesBeforeSend/);
  assert.match(source, /autoPreview\.materials\.length > 1/);
  assert.ok(confirmationIndex > -1, 'chat submit should decide whether source confirmation is needed');
  assert.ok(userMessageIndex > -1, 'chat submit should create the user message');
  assert.ok(confirmationIndex < userMessageIndex, 'source confirmation should happen before the message is sent');
  assert.match(source, /showSourcePreview\(autoPreview\);\s*return;/);
  assert.match(source, /lectureIds: lectureIdsForMessage/);
  assert.match(source, /sourcePreview\?\.materials\.length && selectedPreviewLectureIds\.length > 0/);
  assert.match(source, /const updateDraftMessage/);
  assert.match(source, /hasStudySignalForAutoScope/);
  assert.match(source, /学习\|复习\|教我/);
  assert.match(source, /mode !== 'free' \|\| hasStudySignalForAutoScope\(trimmedMessage\)/);
  assert.match(source, /sourcePreviewChunkLabel/);
  assert.match(source, /retrieval\.strategy\.startsWith\('broad_'\)/);
});

test('chat API loads recent session history before creating the next user message', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');
  const historyIndex = source.indexOf('await prisma.chatMessage.findMany');
  const createUserMessageIndex = source.indexOf("role: 'USER'");

  assert.ok(historyIndex > -1, 'chat route should load recent chat history');
  assert.ok(createUserMessageIndex > -1, 'chat route should persist user messages');
  assert.ok(historyIndex < createUserMessageIndex, 'history should exclude the new user message');
  assert.match(source, /orderBy:\s*\{\s*createdAt: 'desc'\s*\}/);
  assert.match(source, /const CHAT_HISTORY_LOAD_LIMIT = 24/);
  assert.match(source, /const CHAT_HISTORY_RECENT_WINDOW = 8/);
  assert.match(source, /take: CHAT_HISTORY_LOAD_LIMIT/);
  assert.match(source, /historyTurnsLoaded: recentHistory\.length/);
  assert.match(source, /historyTurnsCompacted: Math\.max\(0, recentHistory\.length - CHAT_HISTORY_RECENT_WINDOW\)/);
  assert.match(source, /history: recentHistory/);
});

test('chat API uses recent conversation when retrieving follow-up context', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /buildHistoryAwareRetrievalQuery/);
  assert.match(source, /const retrievalQuery = buildHistoryAwareRetrievalQuery/);
  assert.match(source, /query: retrievalQuery/);
  assert.doesNotMatch(source, /retrieveContextForQuery\(\{\s*query: parsed\.data\.message/);
});
