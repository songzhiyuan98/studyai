import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSourceRef, mapLectureDetailToReader } from './reader-format.ts';

const apiLecture = {
  id: 'lec_1',
  title: 'Linear Regression',
  originalName: 'linear-regression.pdf',
  type: 'PDF',
  status: 'PROCESSED',
  fileSize: 4096,
  createdAt: '2026-06-19T19:00:00.000Z',
  folder: { id: 'folder_ml', name: 'Machine Learning' },
  segments: [
    {
      id: 'seg_2',
      text: 'Second paragraph.',
      tokenCount: 2,
      page: 2,
      slide: null,
      charStart: 20,
      charEnd: 37,
      createdAt: '2026-06-19T19:02:00.000Z',
    },
    {
      id: 'seg_1',
      text: 'First paragraph.',
      tokenCount: 2,
      page: 1,
      slide: null,
      charStart: 0,
      charEnd: 16,
      createdAt: '2026-06-19T19:01:00.000Z',
    },
  ],
};

test('formats source refs from page and segment metadata', () => {
  assert.equal(formatSourceRef(apiLecture.segments[0]), 'page 2 · seg_2');
  assert.equal(formatSourceRef({ ...apiLecture.segments[0], page: null, slide: 4 }), 'slide 4 · seg_2');
  assert.equal(formatSourceRef({ ...apiLecture.segments[0], page: null, slide: null }), 'source · seg_2');
});

test('maps lecture detail API data into reader view model', () => {
  const reader = mapLectureDetailToReader(apiLecture);

  assert.equal(reader.id, 'lec_1');
  assert.equal(reader.title, 'Linear Regression');
  assert.equal(reader.metaLine, 'PDF · Machine Learning · 2 segments · uploaded Jun 19, 2026');
  assert.deepEqual(reader.segments.map((segment) => segment.id), ['seg_1', 'seg_2']);
  assert.equal(reader.segments[0].sourceRef, 'page 1 · seg_1');
  assert.equal(reader.segments[0].text, 'First paragraph.');
});
