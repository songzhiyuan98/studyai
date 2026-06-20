import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compactContextText,
  mergeHybridContext,
  retrieveContextForQuery,
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

test('retrieves context directly from a user query', () => {
  const candidates = [
    {
      id: 'seg-1',
      lectureId: 'lecture-a',
      text: 'Lambda calculus explains function application and substitution.',
      page: 2,
      slide: null,
      charStart: 0,
      charEnd: 64,
    },
    {
      id: 'seg-2',
      lectureId: 'lecture-b',
      text: 'Haskell pattern matching chooses the first matching equation.',
      page: 5,
      slide: null,
      charStart: 0,
      charEnd: 61,
    },
    {
      id: 'seg-3',
      lectureId: 'lecture-c',
      text: 'Photosynthesis stores energy in plant cells.',
      page: 1,
      slide: null,
      charStart: 0,
      charEnd: 45,
    },
  ];

  const results = retrieveContextForQuery({
    query: 'How does Haskell pattern matching choose equations?',
    candidateSegments: candidates,
  });

  assert.equal(results[0].segment.id, 'seg-2');
  assert.equal(results[0].reason, 'lexical');
  assert.ok(results.every((result) => result.score > 0));
});

test('merges vector and lexical retrieval into hybrid ranked context', () => {
  const shared = { ...baseSegment, id: 'shared', page: 2, text: 'Polymorphic type variables can be generalized.' };
  const vectorOnly = { ...baseSegment, id: 'vector', page: 3, text: 'A semantically close passage.' };
  const lexicalOnly = { ...baseSegment, id: 'lexical', page: 4, text: 'A keyword-heavy passage.' };

  const results = mergeHybridContext({
    vectorResults: [
      { segment: vectorOnly, score: 0.9, reason: 'vector' },
      { segment: shared, score: 0.8, reason: 'vector' },
    ],
    lexicalResults: [
      { segment: shared, score: 0.7, reason: 'lexical' },
      { segment: lexicalOnly, score: 0.6, reason: 'lexical' },
    ],
    limit: 3,
  });

  assert.equal(results[0].segment.id, 'shared');
  assert.equal(results[0].reason, 'hybrid');
  assert.equal(results.some((result) => result.reason === 'vector'), true);
  assert.equal(results.some((result) => result.reason === 'lexical'), true);
});

test('compacts retrieved context to a bounded string', () => {
  const text = compactContextText([
    { ...baseSegment, id: 'a', page: 1, text: 'A'.repeat(80) },
    { ...baseSegment, id: 'b', page: 2, text: 'B'.repeat(80) },
  ], 60);

  assert.equal(text.length, 60);
  assert.ok(text.endsWith('...'));
});
