import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlaceholderArtifact,
  formatStudyActionTitle,
  mapStoredItemToArtifact,
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

test('formats concise action titles with selected passage count', () => {
  assert.equal(formatStudyActionTitle('explain', 1), 'Explain 1 source passage');
  assert.equal(formatStudyActionTitle('mini_quiz', 3), 'Mini quiz from 3 source passages');
  assert.equal(formatStudyActionTitle('cheat_sheet', 2), 'Cheat sheet draft from 2 source passages');
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
  assert.equal(artifact.title, 'Summary from 2 source passages');
  assert.match(artifact.content, /Gradient descent updates parameters/);
  assert.deepEqual(artifact.sourceRefs, sourceRefs);
});

test('builds placeholder artifacts with related context phrased for learners', () => {
  const artifact = buildPlaceholderArtifact({
    action: 'explain',
    segmentTexts: ['Lambda calculus treats functions as first-class values.'],
    sourceRefs: sourceRefs.slice(0, 1),
    relatedTexts: ['A nearby passage introduces top-level Haskell bindings.'],
    relatedRefs: sourceRefs.slice(1),
  });

  assert.match(artifact.content, /Related context considered:/);
  assert.doesNotMatch(artifact.content, /Retrieved context considered:/);
  assert.deepEqual(artifact.relatedRefs, sourceRefs.slice(1));
});

test('maps stored item rows back into review artifacts', () => {
  const artifact = mapStoredItemToArtifact({
    id: 'item_1',
    type: 'SUMMARY',
    payloadJson: {
      action: 'explain',
      title: 'Explain 2 source passages',
      content: 'Explanation draft grounded in the selected source.',
    },
    sourceRefs,
    createdAt: '2026-06-19T20:00:00.000Z',
  });

  assert.equal(artifact.id, 'item_1');
  assert.equal(artifact.type, 'explain');
  assert.equal(artifact.itemType, 'SUMMARY');
  assert.equal(artifact.title, 'Explain 2 source passages');
  assert.equal(artifact.content, 'Explanation draft grounded in the selected source.');
  assert.deepEqual(artifact.sourceRefs.map((ref) => ref.label), ['page 1 · seg_1', 'page 2 · seg_2']);
});

test('maps legacy translation items without adding translation to reader actions', () => {
  const artifact = mapStoredItemToArtifact({
    id: 'item_translation',
    type: 'TRANSLATION',
    payloadJson: {
      title: 'Translated explanation',
      content: '梯度下降通过减少损失来更新参数。',
    },
    sourceRefs,
    createdAt: '2026-06-19T20:05:00.000Z',
  });

  assert.equal(artifact.type, 'translate');
  assert.equal(artifact.itemType, 'TRANSLATION');
  assert.equal(artifact.title, 'Translated explanation');
  assert.equal(studyActions.some((action) => action.id === 'translate'), false);
});
