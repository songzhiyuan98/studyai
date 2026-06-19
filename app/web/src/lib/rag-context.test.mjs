import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compactContextText,
  retrieveRelatedContext,
  tokenizeForRetrieval,
} from './rag-context.ts';

const baseSegment = {
  lectureId: 'lec_1',
  slide: null,
  charStart: 0,
  charEnd: 100,
};

test('tokenizes retrieval text without common stop words', () => {
  assert.deepEqual(
    tokenizeForRetrieval('The Haskell function maps values to values.'),
    ['haskell', 'function', 'maps', 'values', 'values'],
  );
});

test('retrieves lexical and nearby context excluding selected segments', () => {
  const selected = [{
    ...baseSegment,
    id: 'seg_selected',
    page: 4,
    text: 'Haskell functions are first class values and can be passed as arguments.',
  }];
  const candidates = [
    {
      ...baseSegment,
      id: 'seg_same_page',
      page: 4,
      text: 'A top level binding names a function value.',
    },
    {
      ...baseSegment,
      id: 'seg_lexical',
      page: 9,
      text: 'Functions can be passed as arguments and returned as values in functional languages.',
    },
    {
      ...baseSegment,
      id: 'seg_noise',
      page: 20,
      text: 'This page discusses unrelated syntax trivia.',
    },
  ];

  const results = retrieveRelatedContext({ selectedSegments: selected, candidateSegments: candidates, limit: 2 });

  assert.equal(results.length, 2);
  assert.equal(results.some((result) => result.segment.id === 'seg_selected'), false);
  assert.equal(results[0].segment.id, 'seg_lexical');
  assert.ok(results.some((result) => result.segment.id === 'seg_same_page'));
});

test('compacts retrieved context to a bounded string', () => {
  const text = compactContextText([
    { ...baseSegment, id: 'a', page: 1, text: 'A'.repeat(80) },
    { ...baseSegment, id: 'b', page: 2, text: 'B'.repeat(80) },
  ], 60);

  assert.equal(text.length, 60);
  assert.ok(text.endsWith('...'));
});
