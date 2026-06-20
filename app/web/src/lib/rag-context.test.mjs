import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compactContextText,
  extractRequestedPageNumber,
  expandRetrievedContextWithNeighbors,
  mergeHybridContext,
  retrieveBroadCoverageContext,
  retrieveContextForPageRequest,
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

test('extracts requested page numbers from English and Chinese queries', () => {
  assert.equal(extractRequestedPageNumber('explain page 9 in detail'), 9);
  assert.equal(extractRequestedPageNumber('look at p. 12'), 12);
  assert.equal(extractRequestedPageNumber('详细给我讲讲第九页'), 9);
  assert.equal(extractRequestedPageNumber('第21页讲什么'), 21);
  assert.equal(extractRequestedPageNumber('teach lambda syntax'), null);
});

test('retrieves exact page context before lexical fallback', () => {
  const results = retrieveContextForPageRequest({
    query: '详细给我讲讲第九页',
    candidateSegments: [
      { id: 'p10', lectureId: 'lambda', text: 'page ten', page: 10, slide: null, charStart: 0, charEnd: 8 },
      { id: 'p9b', lectureId: 'lambda', text: 'second page nine chunk', page: 9, slide: null, charStart: 20, charEnd: 42 },
      { id: 'p9a', lectureId: 'lambda', text: 'first page nine chunk', page: 9, slide: null, charStart: 0, charEnd: 21 },
    ],
  });

  assert.deepEqual(results.map((result) => result.segment.id), ['p9a', 'p9b']);
  assert.equal(results[0].reason, 'nearby');
});

test('retrieves broad assessment coverage across lectures', () => {
  const results = retrieveBroadCoverageContext({
    query: 'make a mock midterm for CSE 114A',
    candidateSegments: [
      { id: 'lambda-1', lectureId: 'lambda', text: 'lambda abstraction and application', page: 1, slide: null, charStart: 0, charEnd: 20 },
      { id: 'lambda-50', lectureId: 'lambda', text: 'beta reduction examples', page: 50, slide: null, charStart: 0, charEnd: 20 },
      { id: 'types-1', lectureId: 'types', text: 'type inference basics', page: 1, slide: null, charStart: 0, charEnd: 20 },
      { id: 'types-50', lectureId: 'types', text: 'polymorphic types', page: 50, slide: null, charStart: 0, charEnd: 20 },
      { id: 'classes-1', lectureId: 'typeclasses', text: 'typeclass constraints', page: 1, slide: null, charStart: 0, charEnd: 20 },
      { id: 'classes-50', lectureId: 'typeclasses', text: 'functor examples', page: 50, slide: null, charStart: 0, charEnd: 20 },
    ],
    perLecture: 2,
    limit: 6,
  });

  assert.deepEqual(
    Array.from(new Set(results.map((result) => result.segment.lectureId))).sort(),
    ['lambda', 'typeclasses', 'types'],
  );
  assert.equal(results.length, 6);
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

test('expands focused retrieval with neighboring source-order context', () => {
  const seed = { ...baseSegment, id: 'seed', page: 2, charStart: 50, charEnd: 90, text: 'Pattern matching chooses equations.' };
  const results = expandRetrievedContextWithNeighbors({
    retrieved: [{ segment: seed, score: 0.8, reason: 'lexical' }],
    candidateSegments: [
      { ...baseSegment, id: 'far', page: 8, charStart: 0, charEnd: 40, text: 'Far away material.' },
      { ...baseSegment, id: 'before', page: 2, charStart: 0, charEnd: 49, text: 'Before the seed.' },
      seed,
      { ...baseSegment, id: 'after', page: 2, charStart: 91, charEnd: 130, text: 'After the seed.' },
      { ...baseSegment, id: 'other-lecture', lectureId: 'lec_2', page: 2, charStart: 0, charEnd: 40, text: 'Other lecture.' },
    ],
    neighborsPerSeed: 1,
    limit: 3,
  });

  assert.deepEqual(results.map((result) => result.segment.id), ['before', 'seed', 'after']);
  assert.equal(results.find((result) => result.segment.id === 'seed')?.reason, 'lexical');
  assert.equal(results.find((result) => result.segment.id === 'before')?.reason, 'nearby');
  assert.equal(results.some((result) => result.segment.id === 'far'), false);
});

test('compacts retrieved context to a bounded string', () => {
  const text = compactContextText([
    { ...baseSegment, id: 'a', page: 1, text: 'A'.repeat(80) },
    { ...baseSegment, id: 'b', page: 2, text: 'B'.repeat(80) },
  ], 60);

  assert.equal(text.length, 60);
  assert.ok(text.endsWith('...'));
});
