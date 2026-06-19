import assert from 'node:assert/strict';
import test from 'node:test';
import { getEmbeddingConfig, isEmbeddingConfigured } from './embeddings.ts';

const originalApiKey = process.env.OPENAI_API_KEY;
const originalBaseUrl = process.env.OPENAI_BASE_URL;
const originalModel = process.env.OPENAI_MODEL_EMBEDDING;

test('detects placeholder embedding configuration as disabled', () => {
  process.env.OPENAI_API_KEY = 'sk-your-openai-api-key-here';
  assert.equal(isEmbeddingConfigured(), false);
});

test('detects real-looking embedding key as enabled', () => {
  process.env.OPENAI_API_KEY = 'sk-test-real-looking-key';
  assert.equal(isEmbeddingConfigured(), true);
});

test('returns embedding defaults without shared env parsing', () => {
  process.env.OPENAI_API_KEY = '';
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL_EMBEDDING;

  assert.deepEqual(getEmbeddingConfig(), {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'text-embedding-3-small',
  });
});

test.after(() => {
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
    delete process.env.OPENAI_MODEL_EMBEDDING;
  } else {
    process.env.OPENAI_MODEL_EMBEDDING = originalModel;
  }
});
