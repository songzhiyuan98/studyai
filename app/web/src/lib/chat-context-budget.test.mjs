import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAT_CONTEXT_SEGMENT_FETCH_LIMIT,
  getChatContextCharBudget,
} from './chat-context-budget.ts';

test('chat context budget gives full lecture learning a larger source pack', () => {
  assert.equal(CHAT_CONTEXT_SEGMENT_FETCH_LIMIT, 180);
  assert.equal(getChatContextCharBudget({ contextStrategy: 'lecture_pack' }), 18000);
  assert.equal(getChatContextCharBudget({ contextStrategy: 'long_document_map' }), 9000);
});

test('chat context budget keeps focused retrieval compact', () => {
  assert.equal(getChatContextCharBudget({ contextStrategy: 'focused_rag' }), 1800);
  assert.equal(getChatContextCharBudget({ contextStrategy: 'broad_rag' }), 9000);
});
