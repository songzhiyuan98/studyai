import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGroundedPrompt,
  generateGroundedChatAnswer,
  getChatModelConfig,
  isChatModelConfigured,
} from './chat-llm.ts';

const originalApiKey = process.env.OPENAI_API_KEY;
const originalBaseUrl = process.env.OPENAI_BASE_URL;
const originalModel = process.env.OPENAI_MODEL_CHAT;

function restoreEnv() {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }

  if (originalBaseUrl === undefined) {
    delete process.env.OPENAI_BASE_URL;
  } else {
    process.env.OPENAI_BASE_URL = originalBaseUrl;
  }

  if (originalModel === undefined) {
    delete process.env.OPENAI_MODEL_CHAT;
  } else {
    process.env.OPENAI_MODEL_CHAT = originalModel;
  }
}

test('detects placeholder chat model configuration as disabled', () => {
  process.env.OPENAI_API_KEY = 'sk-your-openai-api-key-here';
  assert.equal(isChatModelConfigured(), false);
  restoreEnv();
});

test('returns chat model defaults from environment', () => {
  process.env.OPENAI_API_KEY = '';
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL_CHAT;

  assert.deepEqual(getChatModelConfig(), {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  });
  restoreEnv();
});

test('builds grounded prompts with source markers and context limits', () => {
  const prompt = buildGroundedPrompt({
    mode: 'explain',
    message: 'Explain pattern matching',
    contextText: 'Pattern matching chooses the first matching equation.',
    sources: [
      {
        label: 'haskell · page 2',
        text: 'Pattern matching chooses the first matching equation.',
      },
    ],
  });

  assert.match(prompt, /\[S1\] haskell · page 2/);
  assert.match(prompt, /Use only the retrieved source context/);
  assert.match(prompt, /Explain pattern matching/);
});

test('skips remote generation when chat model is not configured', async () => {
  process.env.OPENAI_API_KEY = '';

  const answer = await generateGroundedChatAnswer({
    mode: 'summarize',
    message: 'Summarize Haskell functions',
    contextText: 'Haskell functions are first-class values.',
    sources: [],
  });

  assert.equal(answer, null);
  restoreEnv();
});
