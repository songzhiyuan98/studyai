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

type GenerateGroundedAnswerInput = {
  mode: ChatMode;
  message: string;
  contextText: string;
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

export function buildGroundedPrompt({ mode, message, sources }: GenerateGroundedAnswerInput) {
  const sourceBlock = sources.length > 0
    ? sources.map((source, index) => (
      [
        `[S${index + 1}] ${source.label}`,
        source.text,
      ].join('\n')
    )).join('\n\n')
    : 'No retrieved source context.';

  return [
    `Mode: ${chatModeLabels[mode]}`,
    `Student request: ${message}`,
    '',
    'Retrieved source context:',
    sourceBlock,
    '',
    'Answer requirements:',
    '- Use the retrieved sources to understand the student’s course context, terminology, and likely intent.',
    '- Answer like ChatGPT with full tutoring ability: explain, connect concepts, provide examples, and fill in basic background when helpful.',
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
