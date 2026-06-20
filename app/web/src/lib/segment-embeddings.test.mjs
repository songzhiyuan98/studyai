import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkEmbeddingInputs } from './segment-embedding-batches.ts';

test('chunks segment embedding inputs into stable batches', () => {
  assert.deepEqual(chunkEmbeddingInputs([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkEmbeddingInputs([], 2), []);
});
