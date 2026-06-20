import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  buildGroundedPrompt,
  buildHistoryAwareRetrievalQuery,
  chunkTextForLocalStream,
  compactChatHistory,
  generateGroundedChatAnswer,
  getChatModelConfig,
  isChatModelConfigured,
  parseChatCompletionStreamLine,
  shouldUseStudyRetrieval,
} from './chat-llm.ts';

const originalApiKey = process.env.OPENAI_API_KEY;
const originalBaseUrl = process.env.OPENAI_BASE_URL;
const originalModel = process.env.OPENAI_MODEL_CHAT;
const sourcePath = resolve(new URL('.', import.meta.url).pathname, 'chat-llm.ts');

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

test('uses a natural tutoring temperature for model generation', () => {
  const source = readFileSync(sourcePath, 'utf8');

  assert.match(source, /temperature: 0\.45/);
  assert.doesNotMatch(source, /temperature: 0\.2/);
});

test('builds source-aware prompts with source markers and general tutoring room', () => {
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
  assert.match(prompt, /understand the student’s course context/);
  assert.match(prompt, /Study context package:/);
  assert.match(prompt, /Use general model knowledge for universal concepts/);
  assert.match(prompt, /The source package is for scope, course-specific wording, examples, and citations/);
  assert.match(prompt, /Answer like ChatGPT with full tutoring ability/);
  assert.match(prompt, /Do not fabricate citations/);
  assert.match(prompt, /Explain pattern matching/);
});

test('builds prompts with planner-resolved library scope for the teaching agent', () => {
  const prompt = buildGroundedPrompt({
    mode: 'mini_quiz',
    message: '我马上要考 114a，帮我整理模拟 midterm',
    contextText: 'Haskell functions and types are core course topics.',
    delegatedAgent: 'assessment_agent',
    contextStrategy: 'broad_rag',
    contextSummary: {
      totalSegments: 120,
      includedSegments: 16,
      truncated: true,
      maxChars: 3800,
    },
    resolvedScope: {
      source: 'course',
      confidence: 'high',
      matchedLabels: ['CSE 114A'],
      reason: 'The planner matched the request against Library folders and course labels before retrieval.',
    },
    sources: [
      {
        label: 'lambda · page 1',
        text: 'Functions are first-class values.',
      },
    ],
  });

  assert.match(prompt, /Delegated agent: assessment_agent/);
  assert.match(prompt, /Context strategy: broad_rag/);
  assert.match(prompt, /Context coverage from planner:/);
  assert.match(prompt, /Included passages: 16 of 120/);
  assert.doesNotMatch(prompt, /Included segments/);
  assert.match(prompt, /Truncated: yes/);
  assert.match(prompt, /Resolved Library scope from planner:/);
  assert.match(prompt, /Source: course/);
  assert.match(prompt, /Matched labels: CSE 114A/);
  assert.match(prompt, /Agent boundary: planner coordinates intent, scope, and tools/);
  assert.match(prompt, /Agent freedom: adapt the teaching path to the student/);
  assert.match(prompt, /If context coverage says the source was truncated/);
});

test('builds prompts with recent conversation history for follow-up questions', () => {
  const prompt = buildGroundedPrompt({
    mode: 'free',
    message: 'Can you continue from that example?',
    contextText: 'Pattern matching chooses the first matching equation.',
    history: [
      {
        role: 'user',
        content: 'What is pattern matching?',
      },
      {
        role: 'assistant',
        content: 'Pattern matching checks values against ordered cases.',
      },
    ],
    sources: [
      {
        label: 'haskell · page 2',
        text: 'Pattern matching chooses the first matching equation.',
      },
    ],
  });

  assert.match(prompt, /Recent conversation:/);
  assert.match(prompt, /user: What is pattern matching\?/);
  assert.match(prompt, /assistant: Pattern matching checks values against ordered cases\./);
  assert.match(prompt, /Use recent conversation to resolve follow-up references/);
  assert.match(prompt, /Teaching posture: model_decides/);
  assert.match(prompt, /Decide the teaching posture from the user’s intent/);
  assert.match(prompt, /teach gradually like a patient tutor/);
  assert.match(prompt, /Do not generate quizzes, cheat sheets, or long fixed templates/);
  assert.match(prompt, /Can you continue from that example\?/);
});

test('compacts older chat turns into structured study memory', () => {
  const memory = compactChatHistory([
    {
      role: 'user',
      content: 'I need to review CSE 114A Haskell lambda and types for a midterm.',
    },
    {
      role: 'assistant',
      content: 'We used the lambda lecture as source scope and started with first-class functions.',
    },
    {
      role: 'user',
      content: 'Please teach slowly in Chinese and keep using examples.',
    },
    {
      role: 'assistant',
      content: 'Functions can be passed as values, and types describe valid inputs and outputs.',
    },
    {
      role: 'user',
      content: 'Continue with page 2.',
    },
    {
      role: 'assistant',
      content: 'Page 2 introduces equations and pattern matching.',
    },
    {
      role: 'user',
      content: 'Now quiz me.',
    },
  ], 3, 1800);

  assert.match(memory, /Long-term study memory:/);
  assert.match(memory, /Source\/scope memory:/);
  assert.match(memory, /CSE 114A Haskell lambda and types/);
  assert.match(memory, /Learning preferences:/);
  assert.match(memory, /teach slowly in Chinese/);
  assert.match(memory, /Recent turns:/);
  assert.match(memory, /user: Continue with page 2\./);
  assert.match(memory, /assistant: Page 2 introduces equations and pattern matching\./);
  assert.match(memory, /user: Now quiz me\./);
  assert.doesNotMatch(memory, /Earlier compressed context/);
});

test('builds teacher-mode prompt guidance for beginner page-by-page learning', () => {
  const prompt = buildGroundedPrompt({
    mode: 'free',
    message: '我是小白，带我学会 lambda 每一页内容，用中文',
    contextText: 'Lambda calculus focuses on function abstraction and application.',
    sources: [
      {
        label: 'Lambda · Page 9',
        text: 'Lambda calculus is based on functions.',
      },
    ],
  });

  assert.match(prompt, /Teacher Mode hint: likely/);
  assert.match(prompt, /Use Teacher Mode when the student asks to learn/);
  assert.match(prompt, /why the concept exists and what problem it solves/);
  assert.match(prompt, /mental model\/worldview/);
  assert.match(prompt, /examples are required/);
  assert.match(prompt, /page-by-page requests/);
  assert.match(prompt, /answer in the student’s language/);
  assert.match(prompt, /Do not lead with a generic menu/);
  assert.match(prompt, /first real lesson step/);
  assert.match(prompt, /not terse/);
  assert.match(prompt, /translation or simpler explanation/);
  assert.doesNotMatch(prompt, /Keep the tone natural, concise, and useful for studying/);
});

test('builds history-aware retrieval queries for follow-up messages', () => {
  const query = buildHistoryAwareRetrievalQuery({
    message: 'Can you quiz me on that?',
    history: [
      {
        role: 'user',
        content: 'I need to review Haskell higher-order functions and lambda expressions.',
      },
      {
        role: 'assistant',
        content: 'Higher-order functions can take functions as values.',
      },
    ],
  });

  assert.match(query, /Current request: Can you quiz me on that\?/);
  assert.match(query, /Haskell higher-order functions and lambda expressions/);
  assert.match(query, /Higher-order functions can take functions as values/);
  assert.ok(query.length < 900);
});

test('keeps casual chat history out of retrieval queries', () => {
  const query = buildHistoryAwareRetrievalQuery({
    message: 'Can you explain Haskell functions now?',
    history: [
      {
        role: 'user',
        content: 'hi how are you today?',
      },
      {
        role: 'assistant',
        content: 'I am doing well. What would you like to study?',
      },
      {
        role: 'user',
        content: 'thanks',
      },
    ],
  });

  assert.equal(query, 'Can you explain Haskell functions now?');
});

test('detects when a chat turn should use study retrieval', () => {
  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: 'hi how are you?',
    history: [],
    hasExplicitScope: false,
  }), false);

  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: 'Can you quiz me on that?',
    history: [
      {
        role: 'user',
        content: 'I am reviewing Haskell lambda expressions.',
      },
    ],
    hasExplicitScope: false,
  }), true);

  assert.equal(shouldUseStudyRetrieval({
    mode: 'mini_quiz',
    message: 'make one for me',
    history: [],
    hasExplicitScope: false,
  }), true);

  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: 'continue',
    history: [],
    hasExplicitScope: true,
  }), true);
});

test('detects translation and simpler-explanation follow-ups as study context', () => {
  const history = [
    {
      role: 'user',
      content: 'I am reviewing Haskell lambda expressions.',
    },
    {
      role: 'assistant',
      content: 'Lambda expressions define anonymous functions using course examples.',
    },
  ];

  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: '翻译这个并用中文讲简单点',
    history,
    hasExplicitScope: false,
  }), true);

  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: 'explain that more simply',
    history,
    hasExplicitScope: false,
  }), true);
});

test('detects Chinese learning requests as teacher mode hints', () => {
  const prompt = buildGroundedPrompt({
    mode: 'free',
    message: '我想学习 lambda 这个 lecture',
    contextText: 'Lambda calculus focuses on functions.',
    sources: [
      {
        label: 'Lambda · Page 1',
        text: 'Lambda calculus focuses on functions.',
      },
    ],
  });

  assert.match(prompt, /Teacher Mode hint: likely/);
});

test('detects Chinese study requests as retrieval-worthy in free chat', () => {
  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: '我需要复习 haskell 相关内容，你带我学会每一页',
    history: [],
    hasExplicitScope: false,
  }), true);

  assert.equal(shouldUseStudyRetrieval({
    mode: 'free',
    message: '我马上要考 114a，帮我整理模拟 midterm',
    history: [],
    hasExplicitScope: false,
  }), true);
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

test('parses OpenAI chat completion stream deltas', () => {
  const line = 'data: {"choices":[{"delta":{"content":"hello"}}]}';
  assert.equal(parseChatCompletionStreamLine(line), 'hello');
  assert.equal(parseChatCompletionStreamLine('data: [DONE]'), null);
});

test('chunks local fallback text for server-side streaming', () => {
  assert.deepEqual(chunkTextForLocalStream('abcdef', 2), ['ab', 'cd', 'ef']);
});
