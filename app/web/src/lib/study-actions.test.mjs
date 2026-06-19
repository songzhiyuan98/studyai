import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlaceholderArtifact,
  formatStudyActionTitle,
  studyActions,
} from './study-actions.ts';

const sourceRefs = [
  {
    lectureId: 'lec_1',
    segmentId: 'seg_1',
    page: 1,
    slide: null,
    charStart: 0,
    charEnd: 80,
    label: 'page 1 · seg_1',
  },
  {
    lectureId: 'lec_1',
    segmentId: 'seg_2',
    page: 2,
    slide: null,
    charStart: 81,
    charEnd: 150,
    label: 'page 2 · seg_2',
  },
];

test('exposes stable study action ids for reader controls', () => {
  assert.deepEqual(
    studyActions.map((action) => action.id),
    ['explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet'],
  );
});

test('formats concise action titles with selected segment count', () => {
  assert.equal(formatStudyActionTitle('explain', 1), 'Explain 1 source segment');
  assert.equal(formatStudyActionTitle('mini_quiz', 3), 'Mini quiz from 3 source segments');
  assert.equal(formatStudyActionTitle('cheat_sheet', 2), 'Cheat sheet draft from 2 source segments');
});

test('builds placeholder artifacts with source references preserved', () => {
  const artifact = buildPlaceholderArtifact({
    action: 'summarize',
    segmentTexts: [
      'Gradient descent updates parameters in the direction that reduces loss.',
      'A learning rate controls how large each update step should be.',
    ],
    sourceRefs,
  });

  assert.equal(artifact.type, 'summarize');
  assert.equal(artifact.title, 'Summary from 2 source segments');
  assert.match(artifact.content, /Gradient descent updates parameters/);
  assert.deepEqual(artifact.sourceRefs, sourceRefs);
});
