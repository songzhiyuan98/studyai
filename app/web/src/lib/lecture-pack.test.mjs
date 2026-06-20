import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLecturePackContext, buildLongDocumentMapContext } from './lecture-pack.ts';

const segments = [
  {
    id: 's3',
    lectureId: 'lecture-b',
    text: 'Second lecture first page.',
    page: 1,
    slide: null,
    charStart: 0,
    charEnd: 25,
  },
  {
    id: 's2',
    lectureId: 'lecture-a',
    text: 'Page two introduces examples.',
    page: 2,
    slide: null,
    charStart: 0,
    charEnd: 29,
  },
  {
    id: 's1',
    lectureId: 'lecture-a',
    text: 'Page one defines the core idea.',
    page: 1,
    slide: null,
    charStart: 0,
    charEnd: 31,
  },
];

test('packs lecture context in source order with page markers', () => {
  const pack = buildLecturePackContext({
    candidateSegments: segments,
    maxChars: 1000,
    lectureLabels: {
      'lecture-a': 'Lambda lecture',
      'lecture-b': 'Typeclasses lecture',
    },
  });

  assert.deepEqual(pack.segments.map((segment) => segment.id), ['s1', 's2', 's3']);
  assert.equal(pack.totalSegments, 3);
  assert.equal(pack.includedSegments, 3);
  assert.equal(pack.truncated, false);
  assert.match(pack.contextText, /\[Lambda lecture · page 1\]\nPage one defines the core idea\./);
  assert.match(pack.contextText, /\[Lambda lecture · page 2\]\nPage two introduces examples\./);
  assert.match(pack.contextText, /\[Typeclasses lecture · page 1\]\nSecond lecture first page\./);
});

test('keeps whole segments while respecting a context budget', () => {
  const pack = buildLecturePackContext({
    candidateSegments: segments,
    maxChars: 85,
  });

  assert.deepEqual(pack.segments.map((segment) => segment.id), ['s1']);
  assert.equal(pack.totalSegments, 3);
  assert.equal(pack.includedSegments, 1);
  assert.equal(pack.truncated, true);
  assert.equal(pack.maxChars, 85);
  assert.match(pack.contextText, /Page one defines the core idea/);
  assert.doesNotMatch(pack.contextText, /Page two introduces examples/);
});

test('shares pack budget across multiple lectures', () => {
  const pack = buildLecturePackContext({
    candidateSegments: [
      {
        id: 'a1',
        lectureId: 'lecture-a',
        text: 'First lecture anchor. '.repeat(4),
        page: 1,
        slide: null,
        charStart: 0,
        charEnd: 90,
      },
      {
        id: 'a2',
        lectureId: 'lecture-a',
        text: 'First lecture extra. '.repeat(4),
        page: 2,
        slide: null,
        charStart: 0,
        charEnd: 90,
      },
      {
        id: 'b1',
        lectureId: 'lecture-b',
        text: 'Second lecture anchor. '.repeat(4),
        page: 1,
        slide: null,
        charStart: 0,
        charEnd: 94,
      },
    ],
    maxChars: 240,
    lectureLabels: {
      'lecture-a': 'Lambda lecture',
      'lecture-b': 'Types lecture',
    },
  });

  assert.deepEqual(pack.segments.map((segment) => segment.id), ['a1', 'b1']);
  assert.match(pack.contextText, /First lecture anchor/);
  assert.doesNotMatch(pack.contextText, /First lecture extra/);
  assert.match(pack.contextText, /Second lecture anchor/);
});

test('builds a long document map with page range and representative passages', () => {
  const longSegments = Array.from({ length: 12 }, (_, index) => ({
    id: `page-${index + 1}`,
    lectureId: 'haskell',
    text: `Page ${index + 1} covers concept ${index + 1} with an example.`,
    page: index + 1,
    slide: null,
    charStart: 0,
    charEnd: 48,
  }));

  const pack = buildLongDocumentMapContext({
    candidateSegments: longSegments,
    maxChars: 1200,
    lectureLabels: {
      haskell: 'Haskell lecture',
    },
  });

  assert.equal(pack.totalSegments, 12);
  assert.ok(pack.includedSegments < pack.totalSegments);
  assert.equal(pack.truncated, true);
  assert.match(pack.contextText, /Document map/);
  assert.match(pack.contextText, /Haskell lecture · pages 1-12 · 12 passages/);
  assert.match(pack.contextText, /\[Haskell lecture · page 1\]/);
  assert.match(pack.contextText, /\[Haskell lecture · page 12\]/);
});
