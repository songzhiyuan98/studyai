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

test('public product copy frames StudyFlow as agentic context orchestration', () => {
  const layoutSource = readFileSync(resolve(root, 'src/app/layout.tsx'), 'utf8');
  const homeSource = readFileSync(resolve(root, 'src/app/page.tsx'), 'utf8');
  const dashboardSource = readFileSync(resolve(root, 'src/app/dashboard/page.tsx'), 'utf8');
  const landingExperienceSource = readFileSync(resolve(root, 'src/components/landing-experience.tsx'), 'utf8');

  assert.match(layoutSource, /agentic study context/);
  assert.match(homeSource, /Plans the right study context/);
  assert.match(homeSource, /organizes the relevant lecture context before teaching/);
  assert.match(landingExperienceSource, /Organize context/);
  assert.match(landingExperienceSource, /source passages/);
  assert.match(dashboardSource, /agent-organized study desk/);
  assert.doesNotMatch(homeSource, /retrieves from your own lecture files before answering/);
  assert.doesNotMatch(homeSource, /building RAG/);
  assert.doesNotMatch(homeSource, /chunks/);
  assert.doesNotMatch(landingExperienceSource, /chunks/);
  assert.doesNotMatch(landingExperienceSource, /Retrieve chunks/);
  assert.doesNotMatch(dashboardSource, /RAG retrieval are the next ingestion milestone/);
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
  assert.match(source, /source passages/);
  assert.match(source, /needsVectorReindex/);
  assert.match(source, /Reindex vectors/);
  assert.match(source, /\/api\/lectures\/reindex/);
  assert.match(source, /Vector ready/);
  assert.doesNotMatch(source, /document\.segments\} chunks/);
  assert.doesNotMatch(source, /parsed chunks/);
});

test('reader page uses product language for parsed passages', () => {
  const source = readFileSync(resolve(root, 'src/app/documents/[id]/page.tsx'), 'utf8');

  assert.match(source, /passages extracted/);
  assert.match(source, /No readable passages yet/);
  assert.match(source, /Selected passages/);
  assert.match(source, /Related context/);
  assert.doesNotMatch(source, /chunks extracted/);
  assert.doesNotMatch(source, /Selected chunks/);
  assert.doesNotMatch(source, /readable chunks/);
  assert.doesNotMatch(source, /Retrieved context/);
});

test('secondary study surfaces use context language', () => {
  const examSource = readFileSync(resolve(root, 'src/app/exam/[id]/page.tsx'), 'utf8');
  const studySource = readFileSync(resolve(root, 'src/app/study/page.tsx'), 'utf8');

  assert.match(examSource, /source passage about hidden structure/);
  assert.match(studySource, /source passages/);
  assert.doesNotMatch(examSource, /retrieval segment/);
  assert.doesNotMatch(examSource, /RAG/);
  assert.doesNotMatch(studySource, /source segments/);
  assert.doesNotMatch(studySource, /\{segmentCount\} segments/);
});

test('saved page supports selecting and deleting saved outputs', () => {
  const source = readFileSync(resolve(root, 'src/app/review/page.tsx'), 'utf8');
  assert.match(source, /selectedArtifactIds/);
  assert.match(source, /Select visible outputs/);
  assert.match(source, /\/api\/study\/actions\/\$\{artifactId\}/);
  assert.match(source, /Delete saved outputs/);
  assert.match(source, /href=\{`\/documents\/\$\{ref\.lectureId\}\?segmentId=\$\{encodeURIComponent\(ref\.segmentId\)\}`\}/);
});

test('saved outputs can be continued in chat as a draft prompt', () => {
  const savedSource = readFileSync(resolve(root, 'src/app/review/page.tsx'), 'utf8');
  const chatSource = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');

  assert.match(savedSource, /function buildContinueInChatHref/);
  assert.match(savedSource, /artifact\.sourceRefs\.map\(\(ref\) => ref\.lectureId\)/);
  assert.match(savedSource, /chatParams\.set\('draft'/);
  assert.match(savedSource, /chatParams\.set\('mode'/);
  assert.match(savedSource, /chatParams\.set\('lectureIds'/);
  assert.match(savedSource, /Continue in Chat/);
  assert.match(savedSource, /href=\{buildContinueInChatHref\(artifact\)\}/);
  assert.match(chatSource, /const requestedDraft = searchParams\.get\('draft'\)/);
  assert.match(chatSource, /const requestedMode = searchParams\.get\('mode'\)/);
  assert.match(chatSource, /const requestedLectureIds = searchParams\.get\('lectureIds'\)/);
  assert.match(chatSource, /isActionMode\(requestedMode\)/);
  assert.match(chatSource, /decodeURIComponent\(requestedDraft\)/);
  assert.match(chatSource, /requestedLectureIds\.split\(','\)/);
  assert.match(chatSource, /setMessage\(decodedDraft\)/);
  assert.match(chatSource, /setMode\(requestedMode\)/);
  assert.match(chatSource, /setConfirmedSources\(draftLectureIds\)/);
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
  assert.match(source, /organize the right Library context/);
  assert.match(source, /Lock all/);
  assert.doesNotMatch(source, /loadedSources\.slice\(0,\s*3\)/);
  assert.doesNotMatch(source, /will retrieve from your ready Library sources/);
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

test('chat page surfaces safe actions for library operation replies', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');

  assert.match(source, /function isLibraryActionMessage/);
  assert.match(source, /tool_library_manage_v0/);
  assert.match(source, /type LibraryOperationDraft/);
  assert.match(source, /function getLibraryOperationDraft/);
  assert.match(source, /function buildLibraryOperationHref/);
  assert.match(source, /operationDraft/);
  assert.match(source, /Library draft/);
  assert.match(source, /Action/);
  assert.match(source, /Target/);
  assert.match(source, /Destination/);
  assert.match(source, /libraryParams\.set\('action'/);
  assert.match(source, /libraryParams\.set\('target'/);
  assert.match(source, /libraryParams\.set\('destination'/);
  assert.match(source, /href=\{buildLibraryOperationHref\(chatMessage\)\}/);
  assert.match(source, /Open Library/);
});

test('library page can surface chat requested operation intent from URL', () => {
  const source = readFileSync(resolve(root, 'src/app/library/page.tsx'), 'utf8');

  assert.match(source, /useSearchParams/);
  assert.match(source, /const libraryAction = searchParams\.get\('action'\)/);
  assert.match(source, /const libraryTarget = searchParams\.get\('target'\)/);
  assert.match(source, /const libraryDestination = searchParams\.get\('destination'\)/);
  assert.match(source, /useEffect\(\(\) => \{/);
  assert.match(source, /libraryAction === 'upload'/);
  assert.match(source, /setNewItemMode\('file'\)/);
  assert.match(source, /setShowNewFolder\(true\)/);
  assert.match(source, /setSearchQuery\(libraryTarget\)/);
  assert.match(source, /setViewMode\('list'\)/);
  assert.match(source, /Chat requested/);
  assert.match(source, /library-intent-banner/);
});

test('library page can prepare confirmation for chat requested deletes', () => {
  const source = readFileSync(resolve(root, 'src/app/library/page.tsx'), 'utf8');

  assert.match(source, /const chatIntentMatchedDocuments = useMemo/);
  assert.match(source, /libraryAction === 'delete'/);
  assert.match(source, /normalizedLibraryTarget/);
  assert.match(source, /document\.title\.toLowerCase\(\)\.includes\(normalizedLibraryTarget\)/);
  assert.match(source, /document\.originalName\.toLowerCase\(\)\.includes\(normalizedLibraryTarget\)/);
  assert.match(source, /setSelectedLectureIds\(\[chatIntentMatchedDocuments\[0\]\.id\]\)/);
  assert.match(source, /setShowBulkDelete\(true\)/);
  assert.match(source, /Delete is ready for review/);
});

test('chat page surfaces saved-output tool replies without resaving them', () => {
  const source = readFileSync(resolve(root, 'src/app/chat/page.tsx'), 'utf8');

  assert.match(source, /function isArtifactSaveMessage/);
  assert.match(source, /tool_artifact_save_v0/);
  assert.match(source, /shouldShowSourceRefs\(chatMessage\)/);
  assert.match(source, /!isArtifactSaveMessage\(chatMessage\)/);
  assert.match(source, /Open Saved/);
  assert.match(source, /href="\/saved"/);
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
  assert.match(source, /AI selected/);
  assert.match(source, /Auto selected/);
  assert.doesNotMatch(source, /AI planner/);
  assert.doesNotMatch(source, /deterministic fallback/);
  assert.match(source, /lesson context/);
  assert.match(source, /document map/);
  assert.match(source, /material\.count\} passages/);
  assert.doesNotMatch(source, /focused retrieval/);
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
  assert.match(source, /!chatMessage\.isStreaming && shouldShowSourceRefs\(chatMessage\)/);
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
  assert.match(source, /lecture order/);
  assert.match(source, /indexed passages/);
  assert.doesNotMatch(source, /source-order lecture pack/);
  assert.doesNotMatch(source, /relevant chunks/);
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
  assert.match(source, /function shouldPreviewSourceScopeBeforeSend/);
  assert.match(source, /preview\.materials\.length > 1/);
  assert.match(source, /preview\.retrieval\.contextStrategy === 'lecture_pack'/);
  assert.match(source, /preview\.retrieval\.contextStrategy === 'long_document_map'/);
  assert.match(source, /preview\.retrieval\.strategy\.startsWith\('broad_'\)/);
  assert.match(source, /shouldPreviewSourceScopeBeforeSend\(autoPreview\)/);
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
