import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(new URL('../..', import.meta.url).pathname);

test('chat planner exposes internal tool-shaped planning decisions', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /export function planChatTurn/);
  assert.match(source, /export async function planChatTurnWithAi/);
  assert.match(source, /ChatPlannerToolName/);
  assert.match(source, /'library\.catalog'/);
  assert.match(source, /'scope\.resolve'/);
  assert.match(source, /'source\.preview'/);
  assert.match(source, /'rag\.retrieve'/);
  assert.match(source, /'agent\.teach'/);
  assert.match(source, /'artifact\.save'/);
  assert.match(source, /'reader\.open'/);
  assert.match(source, /'library\.manage'/);
  assert.match(source, /teacherModeHint/);
  assert.match(source, /delegatedAgent/);
  assert.match(source, /contextStrategy/);
  assert.match(source, /retrievalBreadth/);
  assert.match(source, /requestedPage/);
  assert.match(source, /requiresConfirmation/);
  assert.match(source, /plannerSource/);
});

test('chat planner can use an AI planning agent with deterministic fallback', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /isChatModelConfigured/);
  assert.match(source, /StudyFlow Planner, an internal planning agent/);
  assert.match(source, /Library catalog observed via internal API/);
  assert.match(source, /libraryCatalog/);
  assert.match(source, /Return only a JSON object/);
  assert.match(source, /Only use library_operation for explicit Library changes/);
  assert.match(source, /normalizeAiPlan/);
  assert.match(source, /fallbackPlan/);
  assert.match(source, /plannerSource: 'ai_planner'/);
  assert.match(source, /plannerSource: 'deterministic'/);
});

test('chat planner models broad assessment generation separately from focused retrieval', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /assessment_generation/);
  assert.match(source, /hasAssessmentIntent/);
  assert.match(source, /broad_assessment/);
  assert.match(source, /broad_lesson/);
  assert.match(source, /lecture_pack/);
  assert.match(source, /focused_rag/);
  assert.match(source, /broad_rag/);
  assert.match(source, /long_document_map/);
  assert.match(source, /要考\|备考/);
  assert.match(source, /representative coverage across the selected course materials/);
  assert.match(source, /broad coverage across the selected lecture or topic/);
});

test('chat planner treats full lecture learning as lecture pack context', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /hasFullLectureLearningIntent/);
  assert.match(source, /contextStrategy: ChatTurnPlan\['contextStrategy'\]/);
  assert.match(source, /teacherModeHint && hasFullLectureLearningIntent\(message\)/);
  assert.match(source, /\? 'lecture_pack'/);
});

test('chat planner separates course-wide learning from focused questions and assessment generation', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /hasCourseWideLearningIntent/);
  assert.match(source, /系统|整理|板块|相关内容/);
  assert.match(source, /teacherModeHint \|\| courseWideLearningIntent/);
  assert.match(source, /courseWideLearningIntent \|\| teacherModeHint && hasFullLectureLearningIntent\(message\)/);
  assert.match(source, /: 'focused_rag'/);
  assert.match(source, /const assessmentIntent = hasAssessmentIntent\(message, mode\)/);
  assert.match(source, /assessmentIntent\s*\n\s*\? 'broad_rag'/);
});

test('chat planner resolves library scope before retrieval and agent response', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /Inspect the student’s Library folders and files before deciding source scope/);
  assert.match(source, /Resolve the source scope from Library metadata before searching passages/);
  assert.doesNotMatch(source, /retrieving chunks/);
  assert.doesNotMatch(source, /few chunks/);
  assert.match(source, /Delegate final response to the teaching agent/);
});

test('chat planner only treats explicit file management verbs as library operations', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-planner.ts'), 'utf8');

  assert.match(source, /hasLibraryOperationIntent/);
  assert.match(source, /hasExplicitLibraryManagementVerb/);
  assert.match(source, /upload/);
  assert.match(source, /rename/);
  assert.match(source, /delete/);
  assert.match(source, /move/);
  assert.match(source, /上传/);
  assert.match(source, /重命名/);
  assert.match(source, /删除/);
  assert.match(source, /移动/);
  assert.doesNotMatch(source, /upload\|rename\|delete\|move\|folder\|file\|library/);
});

test('chat route stores planner trace with retrieval metadata', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /planChatTurnWithAi/);
  assert.match(source, /const chatPlan = await planChatTurnWithAi/);
  assert.match(source, /shouldRetrieveSources = chatPlan\.requiresRetrieval/);
  assert.match(source, /plan: chatPlan/);
  assert.match(source, /function getPlannerTrace/);
  assert.match(source, /plannerSource: chatPlan\.plannerSource/);
  assert.match(source, /plannerModel: chatPlan\.plannerModel/);
  assert.match(source, /plannerRationale: chatPlan\.plannerRationale/);
  assert.match(source, /plannerCatalogLectures/);
  assert.match(source, /formatLibraryCatalogForPlanner\(plannerCatalogLectures\)/);
  assert.match(source, /plannerCatalogCount: plannerCatalogLectures\.length/);
  assert.match(source, /plannedContextStrategy: chatPlan\.contextStrategy/);
  assert.match(source, /contextStrategyAdjusted: effectiveContextStrategy !== chatPlan\.contextStrategy/);
  assert.match(source, /contextCharBudget/);
  assert.match(source, /candidateSegmentCount: candidateSegments\.length/);
  assert.match(source, /activeSegmentCount/);
  assert.match(source, /resolvedScope/);
  assert.match(source, /libraryScope\.matchedLabels/);
  assert.match(source, /sourceMaterials: activeLectures\.map/);
  assert.match(source, /contextSummary/);
  assert.match(source, /lecturePackSummary/);
  assert.match(source, /buildLecturePackContext/);
  assert.match(source, /dedupeRetrievedContext/);
  assert.match(source, /dedupedContextCount/);
  assert.match(source, /expandRetrievedContextWithNeighbors/);
  assert.match(source, /parentChildExpandedCount/);
  assert.match(source, /CHAT_CONTEXT_SEGMENT_FETCH_LIMIT/);
  assert.match(source, /getChatContextCharBudget/);
  assert.match(source, /contextCharBudget/);
  assert.match(source, /contextStrategy: effectiveContextStrategy/);
  assert.match(source, /effectiveContextStrategy/);
  assert.match(source, /long_document_map/);
  assert.match(source, /_count/);
});

test('chat route can call the artifact save tool from planner intent', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /chatPlan\.intent === 'save_request'/);
  assert.match(source, /parseChatSourceRefs/);
  assert.match(source, /function isArtifactSaveTrace/);
  assert.match(source, /retrieval: true/);
  assert.match(source, /!isArtifactSaveTrace\(assistantMessage\.retrieval\)/);
  assert.match(source, /saveChatOutputSchema\.safeParse/);
  assert.match(source, /saveChatOutputAsArtifact/);
  assert.match(source, /tool_artifact_save_v0/);
  assert.match(source, /chat_planner_artifact_save_v0/);
});

test('chat route can return reader links from planner intent', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /chatPlan\.intent === 'reader_navigation'/);
  assert.match(source, /tool_reader_open_v0/);
  assert.match(source, /parseChatSourceRefs\(assistantMessage\.sourceRefs\)/);
  assert.match(source, /sourceRef\.page === chatPlan\.requestedPage/);
  assert.match(source, /const recentTargetRef/);
  assert.match(source, /!chatPlan\.requestedPage \? recentRefs\[0\]/);
  assert.match(source, /findReaderFallbackSourceRef/);
  assert.match(source, /reader_library_fallback/);
  assert.match(source, /title:\s*true/);
  assert.match(source, /segments:\s*\{/);
  assert.match(source, /reader_link_ready/);
  assert.match(source, /Open it from the citation below/);
});

test('chat route handles library operations as confirmation-gated tool requests', () => {
  const source = readFileSync(resolve(root, 'src/app/api/chat/route.ts'), 'utf8');

  assert.match(source, /chatPlan\.intent === 'library_operation'/);
  assert.match(source, /tool_library_manage_v0/);
  assert.match(source, /inferLibraryOperationDraft/);
  assert.match(source, /operationDraft/);
  assert.match(source, /targetLabel/);
  assert.match(source, /requiresConfirmation: true/);
  assert.match(source, /I can prepare that Library change/);
  assert.match(source, /Open Library/);
});

test('library operation draft helper extracts safe confirmation details', () => {
  const source = readFileSync(resolve(root, 'src/lib/chat-library-tools.ts'), 'utf8');

  assert.match(source, /export type LibraryOperationAction/);
  assert.match(source, /export function inferLibraryOperationDraft/);
  assert.match(source, /'upload'/);
  assert.match(source, /'delete'/);
  assert.match(source, /'rename'/);
  assert.match(source, /'move'/);
  assert.match(source, /requiresConfirmation: true/);
  assert.match(source, /targetLabel/);
  assert.match(source, /destinationLabel/);
});
