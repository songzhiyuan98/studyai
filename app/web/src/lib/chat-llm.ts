const PLACEHOLDER_KEYS = new Set([
  '',
  'sk-your-openai-api-key-here',
  'your-openai-api-key',
]);

export type ChatMode = 'free' | 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';

const chatModeLabels: Record<ChatMode, string> = {
  free: 'Study answer',
  explain: 'Explanation',
  summarize: 'Summary',
  key_terms: 'Key terms',
  mini_quiz: 'Mini quiz',
  cheat_sheet: 'Cheat sheet draft',
};

type GroundedSource = {
  label: string;
  text: string;
};

type SourceMaterial = {
  title: string;
  detail: string;
  count: number;
};

export type ChatHistoryTurn = {
  role: 'user' | 'assistant';
  content: string;
  title?: string | null;
};

type GenerateGroundedAnswerInput = {
  mode: ChatMode;
  message: string;
  contextText: string;
  history?: ChatHistoryTurn[];
  sources: GroundedSource[];
  sourceMaterials?: SourceMaterial[];
  delegatedAgent?: 'teaching_agent' | 'assessment_agent' | 'chat_agent' | 'tool_agent';
  contextStrategy?: 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';
  contextSummary?: {
    totalSegments: number;
    includedSegments: number;
    truncated: boolean;
    maxChars: number;
  };
  resolvedScope?: {
    source: string;
    confidence: string;
    matchedLabels: string[];
    reason: string;
  };
};

export type GeneratedChatAnswer = {
  content: string;
  provider: 'openai_chat' | 'local_fallback';
  model: string;
};

export function getChatModelConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini',
  };
}

export function isChatModelConfigured() {
  const { apiKey } = getChatModelConfig();
  return apiKey.startsWith('sk-') && !PLACEHOLDER_KEYS.has(apiKey);
}

function truncateText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function buildStudyMemory(earlierTurns: ChatHistoryTurn[]) {
  const olderLines = earlierTurns
    .map((turn) => ({
      role: turn.role,
      content: truncateText(turn.content, 260),
    }))
    .filter((turn) => turn.content.length > 0);
  const sourceScope = olderLines
    .filter((turn) => (
      /course|cse|lecture|source|scope|material|pdf|page|chapter|haskell|lambda|types?|文件|材料|来源|第\s*\d+\s*页/i.test(turn.content)
    ))
    .slice(-3)
    .map((turn) => `- ${turn.role}: ${turn.content}`);
  const learningPreferences = olderLines
    .filter((turn) => (
      /slow|slowly|simple|simpler|example|chinese|中文|慢|简单|例子|举例|详细/i.test(turn.content)
    ))
    .slice(-3)
    .map((turn) => `- ${turn.role}: ${turn.content}`);
  const conceptsDiscussed = olderLines
    .filter((turn) => turn.role === 'assistant' && hasStudyRetrievalSignal(turn.content))
    .slice(-4)
    .map((turn) => `- ${turn.content}`);
  const pendingDirections = olderLines
    .filter((turn) => /continue|next|quiz|test|page|继续|下一个|测验|题目|第\s*\d+\s*页/i.test(turn.content))
    .slice(-3)
    .map((turn) => `- ${turn.role}: ${turn.content}`);
  const fallback = olderLines
    .slice(-4)
    .map((turn) => `- ${turn.role}: ${turn.content}`);

  return [
    'Long-term study memory:',
    'Source/scope memory:',
    ...(sourceScope.length > 0 ? sourceScope : ['- none captured yet']),
    'Learning preferences:',
    ...(learningPreferences.length > 0 ? learningPreferences : ['- none captured yet']),
    'Concepts already discussed:',
    ...(conceptsDiscussed.length > 0 ? conceptsDiscussed : fallback),
    'Pending directions:',
    ...(pendingDirections.length > 0 ? pendingDirections : ['- none captured yet']),
  ].join('\n');
}

export function compactChatHistory(history: ChatHistoryTurn[] = [], maxTurns = 8, maxChars = 2200) {
  const cleanHistory = history
    .map((turn) => ({
      ...turn,
      content: turn.content.replace(/\s+/g, ' ').trim(),
    }))
    .filter((turn) => turn.content.length > 0);

  if (cleanHistory.length === 0) {
    return 'No prior conversation in this chat.';
  }

  const recentTurns = cleanHistory.slice(-maxTurns);
  const earlierTurns = cleanHistory.slice(0, Math.max(0, cleanHistory.length - recentTurns.length));
  const recentBlock = recentTurns
    .map((turn) => `${turn.role}: ${truncateText(turn.content, 420)}`)
    .join('\n');
  const earlierSummary = earlierTurns.length > 0
    ? `${truncateText(buildStudyMemory(earlierTurns), Math.max(700, Math.floor(maxChars * 0.45)))}\n\nRecent turns:\n`
    : '';
  const historyBlock = `${earlierSummary}${recentBlock}`.trim();

  return truncateText(historyBlock, maxChars);
}

export function hasStudyRetrievalSignal(content: string) {
  return /\b(study|learn|review|explain|teach|understand|translate|translation|simpler|quiz|test|exam|midterm|final|homework|assignment|lecture|slide|chapter|page|pdf|txt|notes?|sources?|materials?|haskell|lambda|functions?|types?|syntax|code|programming|definitions?|concepts?|terms?|examples?)\b/i.test(content)
    || /(学习|复习|教我|带我|讲讲|详细讲|讲简单|简单点|用中文|翻译|学会|考试|要考|备考|测验|测试|题目|作业|lecture|文件|材料|来源|第\s*\d+\s*页|每一页|逐页|概念|例子|代码|语法)/i.test(content);
}

function hasConcreteStudyRetrievalSignal(turn: ChatHistoryTurn) {
  const content = turn.content.trim();
  if (turn.role === 'assistant' && /\b(what would you like to study|when you want to study|tell me what you want to study)\b/i.test(content)) {
    return false;
  }

  return hasStudyRetrievalSignal(content);
}

function isStudyFollowUp(content: string) {
  return /\b(this|that|it|those|them|continue|more|again|next|quiz me|test me|summari[sz]e|explain|review|translate|translation|simpler)\b/i.test(content)
    || /(这个|那个|继续|下一个|翻译|用中文|讲简单|简单点|再讲|换种说法)/i.test(content);
}

function addRetrievalHints(hints: Set<string>, content: string, pattern: RegExp, terms: string[]) {
  if (pattern.test(content)) {
    terms.forEach((term) => hints.add(term));
  }
}

function buildRetrievalHints(message: string, history: ChatHistoryTurn[] = []) {
  const content = [
    message,
    ...history.slice(-4).map((turn) => turn.content),
  ].join('\n').toLowerCase();
  const hints = new Set<string>();

  addRetrievalHints(hints, content, /考试|要考|备考|midterm|final|exam|mock|模拟|测试|测验|quiz|practice/i, [
    'exam',
    'practice',
    'quiz',
    'midterm',
  ]);
  addRetrievalHints(hints, content, /学习|复习|学会|带我|教我|讲讲|详细|learn|study|review|teach|explain/i, [
    'learn',
    'review',
    'explain',
    'examples',
  ]);
  addRetrievalHints(hints, content, /函数|function|lambda|higher.order|first.class/i, [
    'function',
    'functions',
    'lambda',
  ]);
  addRetrievalHints(hints, content, /类型|type\b|types\b|typeclass|polymorph|inference|类型类/i, [
    'type',
    'types',
    'typeclass',
    'inference',
  ]);
  addRetrievalHints(hints, content, /模式匹配|pattern|matching/i, [
    'pattern',
    'matching',
  ]);

  return Array.from(hints);
}

function appendRetrievalHints(query: string, message: string, history: ChatHistoryTurn[] = []) {
  const hints = buildRetrievalHints(message, history);
  if (hints.length === 0) {
    return query;
  }

  return [
    query,
    '',
    `Retrieval hints: ${hints.join(' ')}`,
  ].join('\n');
}

function usesChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function getRequiredResponseLanguage(message: string) {
  return usesChinese(message) ? 'Chinese' : 'English';
}

function getResponseDepthContract({
  mode,
  message,
  agentRole,
  contextStrategy,
  teacherModeHint,
}: {
  mode: ChatMode;
  message: string;
  agentRole: NonNullable<GenerateGroundedAnswerInput['delegatedAgent']>;
  contextStrategy?: GenerateGroundedAnswerInput['contextStrategy'];
  teacherModeHint: boolean;
}) {
  if (agentRole === 'assessment_agent' || mode === 'mini_quiz') {
    return 'Target response depth: generate a complete but reviewable assessment artifact with representative coverage, concise answer guidance, and source-aware scope notes.';
  }

  if (
    agentRole === 'teaching_agent'
    || teacherModeHint
    || contextStrategy === 'lecture_pack'
    || contextStrategy === 'long_document_map'
  ) {
    const lengthTarget = usesChinese(message)
      ? '600-1000 Chinese characters'
      : '350-650 English words';

    return [
      `Target response depth: ${lengthTarget} for the first teaching turn unless the student asks for a very short answer.`,
      'teach one coherent first step, not an outline-only menu: explain why the topic exists, build the mental model, work through one concrete example, and end with one small check question.',
      'If the source is long or truncated, teach from the current package and say you can continue through the next pages/sections after this step.',
    ].join('\n');
  }

  if (mode === 'summarize' || mode === 'key_terms' || mode === 'cheat_sheet') {
    return 'Target response depth: produce the requested artifact clearly and compactly, with enough detail to study from.';
  }

  return 'Target response depth: answer naturally like ChatGPT; be concise for casual chat and fuller when the student asks to study.';
}

export function shouldUseStudyRetrieval({
  mode,
  message,
  history = [],
  hasExplicitScope = false,
}: {
  mode: ChatMode;
  message: string;
  history?: ChatHistoryTurn[];
  hasExplicitScope?: boolean;
}) {
  if (mode !== 'free' || hasExplicitScope || hasStudyRetrievalSignal(message) || shouldUseTeacherMode(message, mode)) {
    return true;
  }

  return isStudyFollowUp(message) && history.slice(-4).some((turn) => hasConcreteStudyRetrievalSignal(turn));
}

export function shouldUseTeacherMode(message: string, mode: ChatMode) {
  if (mode === 'mini_quiz' || mode === 'cheat_sheet' || mode === 'key_terms') {
    return false;
  }

  return /(\bteach\b|\blearn\b|\breview\b|\bfrom scratch\b|\bbeginner\b|\bnew to\b|\bwalk me through\b|\beach page\b|学习|复习|带我|教我|学会|从头|小白|没接触过|每一页|逐页|详细讲|讲讲|听你的安排)/i.test(message);
}

export function buildHistoryAwareRetrievalQuery({
  message,
  history = [],
}: {
  message: string;
  history?: ChatHistoryTurn[];
}) {
  const usefulHistory = history
    .slice(-4)
    .filter((turn) => hasConcreteStudyRetrievalSignal(turn))
    .map((turn) => `${turn.role}: ${truncateText(turn.content, 260)}`)
    .join('\n');

  if (!usefulHistory) {
    return truncateText(appendRetrievalHints(message, message, history), 850);
  }

  return truncateText(appendRetrievalHints([
    'Recent study conversation:',
    usefulHistory,
    '',
    `Current request: ${message}`,
  ].join('\n'), message, history), 850);
}

export function buildGroundedPrompt({
  mode,
  message,
  history,
  sources,
  delegatedAgent,
  contextStrategy,
  contextSummary,
  resolvedScope,
  sourceMaterials = [],
}: GenerateGroundedAnswerInput) {
  const sourceBlock = sources.length > 0
    ? sources.map((source, index) => (
      [
        `[S${index + 1}] ${source.label}`,
        source.text,
      ].join('\n')
    )).join('\n\n')
    : 'No packaged study context.';
  const historyBlock = compactChatHistory(history);
  const teacherModeHint = shouldUseTeacherMode(message, mode);
  const inferredAgentRole = mode === 'mini_quiz'
    ? 'assessment_agent'
    : teacherModeHint || mode === 'explain' || mode === 'summarize' || mode === 'key_terms' || mode === 'cheat_sheet'
      ? 'teaching_agent'
      : 'chat_agent';
  const agentRole = delegatedAgent || inferredAgentRole;
  const scopeBlock = resolvedScope
    ? [
      `Source: ${resolvedScope.source}`,
      `Confidence: ${resolvedScope.confidence}`,
      `Matched labels: ${resolvedScope.matchedLabels.length > 0 ? resolvedScope.matchedLabels.join(', ') : 'none'}`,
      `Reason: ${resolvedScope.reason}`,
    ].join('\n')
    : 'No resolved Library scope was provided.';
  const contextSummaryBlock = contextSummary
    ? [
      `Included passages: ${contextSummary.includedSegments} of ${contextSummary.totalSegments}`,
      `Context budget: ${contextSummary.maxChars} chars`,
      `Truncated: ${contextSummary.truncated ? 'yes' : 'no'}`,
    ].join('\n')
    : 'No context summary was provided.';
  const materialScopeBlock = sourceMaterials.length > 0
    ? sourceMaterials.map((material, index) => (
      `${index + 1}. ${material.title} · ${material.detail} · ${material.count} indexed passages`
    )).join('\n')
    : 'No selected material manifest was provided.';
  const responseDepthContract = getResponseDepthContract({
    mode,
    message,
    agentRole,
    contextStrategy,
    teacherModeHint,
  });
  const requiredResponseLanguage = getRequiredResponseLanguage(message);

  return [
    `Mode: ${chatModeLabels[mode]}`,
    `Delegated agent: ${agentRole}`,
    `Context strategy: ${contextStrategy || 'not_provided'}`,
    `Required response language: ${requiredResponseLanguage}`,
    requiredResponseLanguage === 'Chinese'
      ? 'Answer in Chinese because the student wrote in Chinese. Keep technical terms like Haskell, type class, lambda, and unification in English when that is clearer, but explain them in Chinese.'
      : 'Answer in English because the student wrote in English unless they explicitly ask for another language.',
    'Planner contract: the planner has already inspected Library metadata, resolved likely source scope, and packaged study context when needed.',
    'Teaching posture: model_decides',
    `Teacher Mode hint: ${teacherModeHint ? 'likely' : 'not_forced'}`,
    `Student request: ${message}`,
    '',
    'Recent conversation:',
    historyBlock,
    '',
    'Resolved Library scope from planner:',
    scopeBlock,
    '',
    'Selected Library materials:',
    materialScopeBlock,
    '',
    'Context coverage from planner:',
    contextSummaryBlock,
    '',
    'Study context package:',
    sourceBlock,
    '',
    responseDepthContract,
    '',
    'Answer requirements:',
    '- Use the study context package to understand the student’s course context, terminology, source order, and likely intent.',
    '- The selected materials are the intended learning scope; the packaged passages are only the current context window used for this turn.',
    '- Use general model knowledge for universal concepts, definitions, mental models, and examples.',
    '- The source package is for scope, course-specific wording, examples, and citations; it is not the full boundary of your intelligence unless the student asks to stay within the files.',
    '- If context coverage says the source was truncated, be honest about teaching from the included coverage and offer to continue through the remaining pages.',
    '- Cite only source-grounded claims. Do not cite general background knowledge unless it is directly supported by the package.',
    '- Use recent conversation to resolve follow-up references like "this", "that", "continue", and "quiz me on it".',
    '- For continuation turns, continue from the latest assistant teaching point and do not restart the lesson overview unless the student asks to restart.',
    '- For translation or simpler explanation follow-ups, preserve the previous study scope and source meaning; translate, rephrase, or simplify instead of starting a new unrelated lesson.',
    '- Answer like ChatGPT with full tutoring ability: explain, connect concepts, provide examples, and fill in basic background when helpful.',
    '- Do not make the answer artificially short. If the student asks to learn or review a topic, provide enough substance for a real lesson.',
    '- Decide the teaching posture from the user’s intent, not from fixed keywords alone: quick answer, normal study chat, guided Teacher Mode, translation, quiz, or page-by-page lesson.',
    '- In free chat, teach gradually like a patient tutor: start with the core idea, check what the student wants next, and avoid dumping every possible artifact at once.',
    '- Use Teacher Mode when the student asks to learn, review, be taught from the beginning, understand every page, or signals they are a beginner.',
    '- If Teacher Mode is appropriate, do not respond with only a menu of topics. Take the lead like a teacher unless the student explicitly asks for choices.',
    '- Do not lead with a generic menu such as "which aspect do you want to start with?" when the student already asked you to teach. Begin the first real lesson step, then invite adjustment.',
    '- In Teacher Mode, first explain why the concept exists and what problem it solves, then build the mental model/worldview, then teach the details in a logical order.',
    '- In Teacher Mode, examples are required. Use small concrete examples, preferably code examples for programming topics, and explain what each line means.',
    '- Agent boundary: planner coordinates intent, scope, and tools; you own the teaching experience. Do not expose internal tool steps unless useful to the student.',
    '- Agent freedom: adapt the teaching path to the student. The following lesson shape is a default, not a script: why this exists, mental model, core mechanics, concrete example, common confusion, small check question.',
    '- In Teacher Mode for beginners, define jargon before using it heavily, use analogies sparingly, and check understanding with one small question or exercise at the end.',
    '- In Teacher Mode for page-by-page requests, follow the packaged source/page order. For each page, provide: translation or source gist, teaching explanation, example, and what to remember.',
    '- In Teacher Mode, answer in the student’s language. If the student writes Chinese, teach in Chinese unless they ask otherwise.',
    '- For broad beginner teaching requests, a useful answer is usually several short sections, not one or two sentences. Be clear and paced, but not terse.',
    '- For exam or mock-test requests, first infer the intended course/material scope from the provided sources, then generate representative questions across the scope instead of overfitting to one passage.',
    '- Do not generate quizzes, cheat sheets, or long fixed templates unless the student asks for them or the matching quick action mode is selected.',
    '- Mention source markers such as [S1] only when a specific sentence or bullet is directly grounded in a retrieved source.',
    '- Do not fabricate citations or claim the sources say something they do not say.',
    '- If the student explicitly asks to answer only from the material, stay within the retrieved sources and say what is missing when context is insufficient.',
    '- Keep the tone natural and useful for studying: avoid rambling, but do not compress real teaching into a tiny answer.',
    '- For quiz or cheat-sheet modes, structure the answer so it is easy to review.',
  ].join('\n');
}

export function parseChatCompletionStreamLine(line: string): string | null {
  if (!line.startsWith('data:')) {
    return null;
  }

  const data = line.replace(/^data:\s*/, '').trim();
  if (!data || data === '[DONE]') {
    return null;
  }

  const payload = JSON.parse(data) as {
    choices?: Array<{
      delta?: {
        content?: string;
      };
    }>;
  };

  return payload.choices?.[0]?.delta?.content || null;
}

export function chunkTextForLocalStream(text: string, chunkSize = 24): string[] {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function generateGroundedChatAnswer(
  input: GenerateGroundedAnswerInput,
): Promise<GeneratedChatAnswer | null> {
  if (!isChatModelConfigured()) {
    return null;
  }

  const { apiKey, baseUrl, model } = getChatModelConfig();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      messages: [
        {
          role: 'system',
          content: 'You are StudyFlow. Act as the delegated teaching agent inside a planner-led study product: natural like ChatGPT, strong as a tutor, and careful with citations. Follow the Required response language field exactly.',
        },
        {
          role: 'user',
          content: buildGroundedPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Chat completion request failed: ${response.status} ${detail}`.trim());
  }

  const payload = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Chat completion returned an empty response.');
  }

  return {
    content,
    provider: 'openai_chat',
    model,
  };
}

export async function* streamGroundedChatAnswer(
  input: GenerateGroundedAnswerInput,
): AsyncGenerator<string> {
  if (!isChatModelConfigured()) {
    return;
  }

  const { apiKey, baseUrl, model } = getChatModelConfig();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are StudyFlow. Act as the delegated teaching agent inside a planner-led study product: natural like ChatGPT, strong as a tutor, and careful with citations. Follow the Required response language field exactly.',
        },
        {
          role: 'user',
          content: buildGroundedPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Chat completion stream failed: ${response.status} ${detail}`.trim());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const delta = parseChatCompletionStreamLine(line.trim());
      if (delta) {
        yield delta;
      }
    }
  }

  if (buffer.trim()) {
    const delta = parseChatCompletionStreamLine(buffer.trim());
    if (delta) {
      yield delta;
    }
  }
}
