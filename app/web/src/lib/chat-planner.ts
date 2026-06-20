import {
  getChatModelConfig,
  isChatModelConfigured,
  shouldUseStudyRetrieval,
  shouldUseTeacherMode,
  type ChatHistoryTurn,
  type ChatMode,
} from './chat-llm';
import { extractRequestedPageNumber } from './rag-context';

export type ChatPlannerToolName =
  | 'library.catalog'
  | 'scope.resolve'
  | 'chat.respond'
  | 'source.preview'
  | 'rag.retrieve'
  | 'agent.teach'
  | 'artifact.save'
  | 'reader.open'
  | 'library.manage';

export type ChatPlannerIntent =
  | 'casual_chat'
  | 'guided_learning'
  | 'retrieval_answer'
  | 'assessment_generation'
  | 'fixed_action'
  | 'save_request'
  | 'reader_navigation'
  | 'library_operation';

export type ChatPlannerToolCall = {
  name: ChatPlannerToolName;
  reason: string;
};

export type ChatTurnPlan = {
  intent: ChatPlannerIntent;
  requiresRetrieval: boolean;
  retrievalBreadth: 'focused' | 'broad_lesson' | 'broad_assessment';
  contextStrategy: 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';
  teacherModeHint: boolean;
  delegatedAgent: 'teaching_agent' | 'assessment_agent' | 'chat_agent' | 'tool_agent';
  requestedPage: number | null;
  requiresConfirmation: boolean;
  tools: ChatPlannerToolCall[];
  plannerSource: 'deterministic' | 'ai_planner';
  plannerModel?: string;
  plannerRationale?: string;
};

export type ChatPlannerCatalogItem = {
  title: string;
  originalName?: string | null;
  courseId?: string | null;
  type?: string | null;
  folder?: {
    name?: string | null;
  } | null;
  _count?: {
    segments?: number;
  };
};

const VALID_INTENTS: ChatPlannerIntent[] = [
  'casual_chat',
  'guided_learning',
  'retrieval_answer',
  'assessment_generation',
  'fixed_action',
  'save_request',
  'reader_navigation',
  'library_operation',
];
const VALID_RETRIEVAL_BREADTHS: ChatTurnPlan['retrievalBreadth'][] = ['focused', 'broad_lesson', 'broad_assessment'];
const VALID_CONTEXT_STRATEGIES: ChatTurnPlan['contextStrategy'][] = ['focused_rag', 'broad_rag', 'lecture_pack', 'long_document_map'];
const VALID_DELEGATED_AGENTS: ChatTurnPlan['delegatedAgent'][] = ['teaching_agent', 'assessment_agent', 'chat_agent', 'tool_agent'];

export function formatLibraryCatalogForPlanner(items: ChatPlannerCatalogItem[]) {
  if (items.length === 0) {
    return 'No ready Library materials.';
  }

  return items.slice(0, 50).map((item, index) => {
    const folder = item.folder?.name || 'Unfiled';
    const course = item.courseId ? ` · course ${item.courseId}` : '';
    const type = item.type ? ` · ${item.type}` : '';
    const originalName = item.originalName && item.originalName !== item.title
      ? ` · file ${item.originalName}`
      : '';
    const chunks = typeof item._count?.segments === 'number'
      ? ` · ${item._count.segments} chunks`
      : '';

    return `${index + 1}. ${folder} / ${item.title}${originalName}${course}${type}${chunks}`;
  }).join('\n');
}

function hasSaveIntent(message: string) {
  return /\b(save|收藏|保存|存一下|save this)\b/i.test(message);
}

function hasReaderNavigationIntent(message: string) {
  return /\b(open|show|go to|source|citation|reader|打开|跳到|来源|原文)\b/i.test(message);
}

function hasLibraryOperationIntent(message: string) {
  return /\b(upload|rename|delete|move|folder|file|library|上传|重命名|删除|移动|文件夹|归档)\b/i.test(message);
}

function hasAssessmentIntent(message: string, mode: ChatMode) {
  return mode === 'mini_quiz' && /\b(midterm|final|exam|mock|practice test|test)\b/i.test(message)
    || /\b(midterm|final|exam|mock|practice test)\b/i.test(message)
    || /(期中|期末|考试|要考|备考|模拟|测试|卷子|试卷|114a)/i.test(message);
}

function hasFullLectureLearningIntent(message: string) {
  return /\b(entire|whole|full|all pages?|page by page|walk me through|from beginning|complete lecture)\b/i.test(message)
    || /(整份|整个|全部|全篇|每一页|逐页|一页一页|从头|完整|带我学会|带我学|讲完|学完整)/i.test(message);
}

function hasCourseWideLearningIntent(message: string) {
  return /\b(course|class|materials?|all lectures?|whole topic|study plan|review plan)\b/i.test(message)
    || /(系统|整理|梳理|相关内容|课程|这门课|材料|全部材料|所有材料|板块|复习计划|学习计划)/i.test(message);
}

function rebuildToolCalls({
  requiresRetrieval,
  hasExplicitScope,
  contextStrategy,
  retrievalBreadth,
  requestedPage,
  delegatedAgent,
}: {
  requiresRetrieval: boolean;
  hasExplicitScope: boolean;
  contextStrategy: ChatTurnPlan['contextStrategy'];
  retrievalBreadth: ChatTurnPlan['retrievalBreadth'];
  requestedPage: number | null;
  delegatedAgent: ChatTurnPlan['delegatedAgent'];
}) {
  const tools: ChatPlannerToolCall[] = [];

  if (requiresRetrieval) {
    tools.push({
      name: 'library.catalog',
      reason: 'Inspect the student’s Library folders and files before deciding source scope.',
    });
    tools.push({
      name: 'scope.resolve',
      reason: 'Resolve the source scope from Library metadata before retrieving chunks.',
    });
    if (!hasExplicitScope) {
      tools.push({ name: 'source.preview', reason: 'The source scope may need recommendation or confirmation.' });
    }
    tools.push({
      name: 'rag.retrieve',
      reason: contextStrategy === 'lecture_pack'
        ? 'Pack the selected lecture in source order instead of retrieving only a few chunks.'
        : retrievalBreadth === 'broad_assessment'
        ? 'Retrieve representative coverage across the selected course materials for assessment generation.'
        : retrievalBreadth === 'broad_lesson'
          ? 'Retrieve broad coverage across the selected lecture or topic for guided learning.'
          : requestedPage
          ? `Retrieve exact page ${requestedPage} before semantic context.`
          : 'Retrieve grounded course context.',
    });
  }

  if (delegatedAgent === 'teaching_agent' || delegatedAgent === 'assessment_agent') {
    tools.push({
      name: 'agent.teach',
      reason: delegatedAgent === 'assessment_agent'
        ? 'Delegate final response to the teaching agent with assessment formatting.'
        : 'Delegate final response to the teaching agent for explanation, examples, and follow-up.',
    });
  }

  tools.push({ name: 'chat.respond', reason: 'Stream a conversational assistant response.' });

  return tools;
}

export function planChatTurn({
  mode,
  message,
  history = [],
  hasExplicitScope = false,
}: {
  mode: ChatMode;
  message: string;
  history?: ChatHistoryTurn[];
  hasExplicitScope?: boolean;
}): ChatTurnPlan {
  const teacherModeHint = shouldUseTeacherMode(message, mode);
  const assessmentIntent = hasAssessmentIntent(message, mode);
  const courseWideLearningIntent = !assessmentIntent && hasCourseWideLearningIntent(message);
  const requiresRetrieval = shouldUseStudyRetrieval({
    mode,
    message,
    history,
    hasExplicitScope,
  });
  const requestedPage = extractRequestedPageNumber(message);
  const retrievalBreadth: ChatTurnPlan['retrievalBreadth'] = assessmentIntent
    ? 'broad_assessment'
    : (teacherModeHint || courseWideLearningIntent) && !requestedPage
      ? 'broad_lesson'
      : 'focused';
  let contextStrategy: ChatTurnPlan['contextStrategy'] = assessmentIntent
    ? 'broad_rag'
    : courseWideLearningIntent || teacherModeHint && hasFullLectureLearningIntent(message)
      ? 'lecture_pack'
      : retrievalBreadth === 'broad_lesson'
        ? 'broad_rag'
        : 'focused_rag';
  let intent: ChatPlannerIntent = 'casual_chat';
  let requiresConfirmation = false;
  let delegatedAgent: ChatTurnPlan['delegatedAgent'] = 'chat_agent';

  if (hasLibraryOperationIntent(message)) {
    intent = 'library_operation';
    delegatedAgent = 'tool_agent';
    requiresConfirmation = true;
  } else if (hasSaveIntent(message)) {
    intent = 'save_request';
    delegatedAgent = 'tool_agent';
    requiresConfirmation = true;
  } else if (hasReaderNavigationIntent(message)) {
    intent = 'reader_navigation';
    delegatedAgent = 'tool_agent';
  } else if (retrievalBreadth === 'broad_assessment') {
    intent = 'assessment_generation';
    delegatedAgent = 'assessment_agent';
  } else if (mode !== 'free') {
    intent = 'fixed_action';
    delegatedAgent = mode === 'mini_quiz' ? 'assessment_agent' : 'teaching_agent';
  } else if (teacherModeHint || courseWideLearningIntent) {
    intent = 'guided_learning';
    delegatedAgent = 'teaching_agent';
  } else if (requiresRetrieval) {
    intent = 'retrieval_answer';
    delegatedAgent = 'teaching_agent';
  }

  const baseTools = intent === 'library_operation'
    ? [{ name: 'library.manage' as const, reason: 'The student is asking to change or organize Library files.' }]
    : intent === 'save_request'
      ? [{ name: 'artifact.save' as const, reason: 'The student is asking to save a useful output.' }]
      : intent === 'reader_navigation'
        ? [{ name: 'reader.open' as const, reason: 'The student is asking to inspect the cited source or original material.' }]
        : [];
  const tools = [
    ...baseTools,
    ...rebuildToolCalls({
      requiresRetrieval,
      hasExplicitScope,
      contextStrategy,
      retrievalBreadth,
      requestedPage,
      delegatedAgent,
    }),
  ];

  return {
    intent,
    requiresRetrieval,
    retrievalBreadth,
    contextStrategy,
    teacherModeHint,
    delegatedAgent,
    requestedPage,
    requiresConfirmation,
    tools,
    plannerSource: 'deterministic',
  };
}

function pickValid<TValue extends string>(value: unknown, validValues: TValue[], fallback: TValue): TValue {
  return typeof value === 'string' && validValues.includes(value as TValue)
    ? value as TValue
    : fallback;
}

function extractJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI planner did not return a JSON object.');
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
}

function normalizeAiPlan({
  aiPlan,
  fallbackPlan,
  hasExplicitScope,
  model,
}: {
  aiPlan: Record<string, unknown>;
  fallbackPlan: ChatTurnPlan;
  hasExplicitScope: boolean;
  model: string;
}): ChatTurnPlan {
  const intent = pickValid(aiPlan.intent, VALID_INTENTS, fallbackPlan.intent);
  const retrievalBreadth = pickValid(aiPlan.retrievalBreadth, VALID_RETRIEVAL_BREADTHS, fallbackPlan.retrievalBreadth);
  const contextStrategy = pickValid(aiPlan.contextStrategy, VALID_CONTEXT_STRATEGIES, fallbackPlan.contextStrategy);
  const delegatedAgent = pickValid(aiPlan.delegatedAgent, VALID_DELEGATED_AGENTS, fallbackPlan.delegatedAgent);
  const requestedPage = typeof aiPlan.requestedPage === 'number'
    ? aiPlan.requestedPage
    : fallbackPlan.requestedPage;
  const requiresRetrieval = typeof aiPlan.requiresRetrieval === 'boolean'
    ? aiPlan.requiresRetrieval
    : fallbackPlan.requiresRetrieval;
  const teacherModeHint = typeof aiPlan.teacherModeHint === 'boolean'
    ? aiPlan.teacherModeHint
    : fallbackPlan.teacherModeHint;
  const requiresConfirmation = typeof aiPlan.requiresConfirmation === 'boolean'
    ? aiPlan.requiresConfirmation
    : intent === 'library_operation' || intent === 'save_request' || fallbackPlan.requiresConfirmation;
  const toolPrefix = intent === 'library_operation'
    ? [{ name: 'library.manage' as const, reason: 'The planner identified a Library operation that requires confirmation.' }]
    : intent === 'save_request'
      ? [{ name: 'artifact.save' as const, reason: 'The planner identified a save request that requires confirmation.' }]
      : intent === 'reader_navigation'
        ? [{ name: 'reader.open' as const, reason: 'The planner identified a request to open cited source context.' }]
        : [];

  return {
    intent,
    requiresRetrieval,
    retrievalBreadth,
    contextStrategy,
    teacherModeHint,
    delegatedAgent,
    requestedPage,
    requiresConfirmation,
    tools: [
      ...toolPrefix,
      ...rebuildToolCalls({
        requiresRetrieval,
        hasExplicitScope,
        contextStrategy,
        retrievalBreadth,
        requestedPage,
        delegatedAgent,
      }),
    ],
    plannerSource: 'ai_planner',
    plannerModel: model,
    plannerRationale: typeof aiPlan.rationale === 'string' ? aiPlan.rationale.slice(0, 500) : undefined,
  };
}

export async function planChatTurnWithAi({
  mode,
  message,
  history = [],
  hasExplicitScope = false,
  libraryCatalog,
}: {
  mode: ChatMode;
  message: string;
  history?: ChatHistoryTurn[];
  hasExplicitScope?: boolean;
  libraryCatalog?: string;
}): Promise<ChatTurnPlan> {
  const fallbackPlan = planChatTurn({
    mode,
    message,
    history,
    hasExplicitScope,
  });

  if (!isChatModelConfigured()) {
    return fallbackPlan;
  }

  const { apiKey, baseUrl, model } = getChatModelConfig();
  const historyPreview = history
    .slice(-6)
    .map((turn) => `${turn.role}: ${turn.content.replace(/\s+/g, ' ').slice(0, 260)}`)
    .join('\n') || 'No prior chat history.';

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: [
              'You are StudyFlow Planner, an internal planning agent.',
              'Return only a JSON object. Do not answer the student.',
              'Choose intent, retrieval breadth, context strategy, and delegated agent.',
              'Do not invent tool names. State-changing operations must require confirmation.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `Mode: ${mode}`,
              `Has explicit selected source scope: ${hasExplicitScope ? 'yes' : 'no'}`,
              `Student message: ${message}`,
              '',
              'Recent history:',
              historyPreview,
              '',
              'Library catalog observed via internal API:',
              libraryCatalog?.trim() || 'No ready Library materials were supplied to the planner.',
              '',
              'Allowed JSON schema:',
              '{',
              '  "intent": "casual_chat|guided_learning|retrieval_answer|assessment_generation|fixed_action|save_request|reader_navigation|library_operation",',
              '  "requiresRetrieval": true|false,',
              '  "retrievalBreadth": "focused|broad_lesson|broad_assessment",',
              '  "contextStrategy": "focused_rag|broad_rag|lecture_pack|long_document_map",',
              '  "teacherModeHint": true|false,',
              '  "delegatedAgent": "teaching_agent|assessment_agent|chat_agent|tool_agent",',
              '  "requestedPage": number|null,',
              '  "requiresConfirmation": true|false,',
              '  "rationale": "short reason"',
              '}',
              '',
              'Planning guidance:',
              '- Use lecture_pack for full lecture, page-by-page, or short complete-source learning.',
              '- Use long_document_map for large papers or PDFs when full packing would be wasteful.',
              '- Use broad_rag for exam prep, course-wide review, or multiple-material synthesis.',
              '- Use focused_rag for specific questions.',
              '- Use the Library catalog to infer likely folder, course, or file scope before retrieval.',
              '- If the student names a course, folder, or lecture that appears in the catalog, prefer the matching scope instead of all materials.',
              '- Casual chat should not retrieve sources.',
            ].join('\n'),
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallbackPlan;
    }

    const payload = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return fallbackPlan;
    }

    return normalizeAiPlan({
      aiPlan: extractJsonObject(content),
      fallbackPlan,
      hasExplicitScope,
      model,
    });
  } catch (error) {
    console.error('AI chat planner failed, falling back to deterministic planner:', error);
    return fallbackPlan;
  }
}
