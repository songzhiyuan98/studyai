import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLecturePackContext } from './lecture-pack.ts';

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
  assert.match(pack.contextText, /Page one defines the core idea/);
  assert.doesNotMatch(pack.contextText, /Page two introduces examples/);
});
