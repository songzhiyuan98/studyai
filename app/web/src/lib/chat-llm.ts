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
    ? `Earlier compressed context: ${truncateText(earlierTurns.map((turn) => `${turn.role}: ${turn.content}`).join(' | '), 650)}\n`
    : '';
  const historyBlock = `${earlierSummary}${recentBlock}`.trim();

  return truncateText(historyBlock, maxChars);
}

export function hasStudyRetrievalSignal(content: string) {
  return /\b(study|learn|review|explain|teach|understand|quiz|test|exam|homework|assignment|lecture|slide|chapter|page|pdf|txt|notes?|sources?|materials?|haskell|lambda|functions?|types?|syntax|code|programming|definitions?|concepts?|terms?|examples?)\b/i.test(content);
}

function hasConcreteStudyRetrievalSignal(turn: ChatHistoryTurn) {
  const content = turn.content.trim();
  if (turn.role === 'assistant' && /\b(what would you like to study|when you want to study|tell me what you want to study)\b/i.test(content)) {
    return false;
  }

  return hasStudyRetrievalSignal(content);
}

function isStudyFollowUp(content: string) {
  return /\b(this|that|it|those|them|continue|more|again|next|quiz me|test me|summari[sz]e|explain|review)\b/i.test(content);
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
  if (mode !== 'free' || hasExplicitScope || hasStudyRetrievalSignal(message)) {
    return true;
  }

  return isStudyFollowUp(message) && history.slice(-4).some((turn) => hasConcreteStudyRetrievalSignal(turn));
}

export function shouldUseTeacherMode(message: string, mode: ChatMode) {
  if (mode === 'mini_quiz' || mode === 'cheat_sheet' || mode === 'key_terms') {
    return false;
  }

  return /(\bteach\b|\blearn\b|\breview\b|\bfrom scratch\b|\bbeginner\b|\bnew to\b|\bwalk me through\b|\beach page\b|带我|教我|学会|从头|小白|没接触过|每一页|逐页|详细讲|听你的安排)/i.test(message);
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
    return message;
  }

  return truncateText([
    'Recent study conversation:',
    usefulHistory,
    '',
    `Current request: ${message}`,
  ].join('\n'), 850);
}

export function buildGroundedPrompt({ mode, message, history, sources }: GenerateGroundedAnswerInput) {
  const sourceBlock = sources.length > 0
    ? sources.map((source, index) => (
      [
        `[S${index + 1}] ${source.label}`,
        source.text,
      ].join('\n')
    )).join('\n\n')
    : 'No retrieved source context.';
  const historyBlock = compactChatHistory(history);
  const teacherModeHint = shouldUseTeacherMode(message, mode);

  return [
    `Mode: ${chatModeLabels[mode]}`,
    'Teaching posture: model_decides',
    `Teacher Mode hint: ${teacherModeHint ? 'likely' : 'not_forced'}`,
    `Student request: ${message}`,
    '',
    'Recent conversation:',
    historyBlock,
    '',
    'Retrieved source context:',
    sourceBlock,
    '',
    'Answer requirements:',
    '- Use the retrieved sources to understand the student’s course context, terminology, and likely intent.',
    '- Use recent conversation to resolve follow-up references like "this", "that", "continue", and "quiz me on it".',
    '- Answer like ChatGPT with full tutoring ability: explain, connect concepts, provide examples, and fill in basic background when helpful.',
    '- Decide the teaching posture from the user’s intent, not from fixed keywords alone: quick answer, normal study chat, guided Teacher Mode, translation, quiz, or page-by-page lesson.',
    '- In free chat, teach gradually like a patient tutor: start with the core idea, check what the student wants next, and avoid dumping every possible artifact at once.',
    '- Use Teacher Mode when the student asks to learn, review, be taught from the beginning, understand every page, or signals they are a beginner.',
    '- If Teacher Mode is appropriate, do not respond with only a menu of topics. Take the lead like a teacher unless the student explicitly asks for choices.',
    '- In Teacher Mode, first explain why the concept exists and what problem it solves, then build the mental model/worldview, then teach the details in a logical order.',
    '- In Teacher Mode, examples are required. Use small concrete examples, preferably code examples for programming topics, and explain what each line means.',
    '- In Teacher Mode for beginners, define jargon before using it heavily, use analogies sparingly, and check understanding with one small question or exercise at the end.',
    '- In Teacher Mode for page-by-page requests, follow the retrieved source/page order. For each page, provide: translation or source gist, teaching explanation, example, and what to remember.',
    '- In Teacher Mode, answer in the student’s language. If the student writes Chinese, teach in Chinese unless they ask otherwise.',
    '- For broad beginner teaching requests, a useful answer is usually several short sections, not one or two sentences.',
    '- Do not generate quizzes, cheat sheets, or long fixed templates unless the student asks for them or the matching quick action mode is selected.',
    '- Mention source markers such as [S1] only when a specific sentence or bullet is directly grounded in a retrieved source.',
    '- Do not fabricate citations or claim the sources say something they do not say.',
    '- If the student explicitly asks to answer only from the material, stay within the retrieved sources and say what is missing when context is insufficient.',
    '- Keep the tone natural, concise, and useful for studying.',
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
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are StudyFlow, a source-grounded study assistant for students. Be helpful, precise, and citation-aware.',
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
      temperature: 0.2,
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are StudyFlow, a source-grounded study assistant for students. Be helpful, precise, and citation-aware.',
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
