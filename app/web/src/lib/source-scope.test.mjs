import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveExplicitLectureScope } from './source-scope.ts';

const lectures = [
  { id: 'lambda-id', title: 'Lambda' },
  { id: 'types-id', title: 'Types' },
  { id: 'typeclasses-id', title: 'Typeclasses' },
];

test('narrows lecture scope when the user names a material topic', () => {
  const scoped = resolveExplicitLectureScope({
    lectures,
    query: '我想学 lambda 语法，那是干什么用的',
  });

  assert.equal(scoped.narrowed, true);
  assert.deepEqual(scoped.lectureIds, ['lambda-id']);
  assert.deepEqual(scoped.lectures.map((lecture) => lecture.title), ['Lambda']);
});

test('uses recent study history to preserve a topic for follow-up questions', () => {
  const scoped = resolveExplicitLectureScope({
    lectures,
    query: 'Recent study conversation:\nuser: I want to learn Lambda syntax.\n\nCurrent request: 详细给我讲讲第九页',
  });

  assert.equal(scoped.narrowed, true);
  assert.deepEqual(scoped.lectureIds, ['lambda-id']);
});

test('keeps the full lecture set when no title topic is named', () => {
  const scoped = resolveExplicitLectureScope({
    lectures,
    query: '我需要复习 haskell 相关的内容',
  });

  assert.equal(scoped.narrowed, false);
  assert.deepEqual(scoped.lectures.map((lecture) => lecture.id), ['lambda-id', 'types-id', 'typeclasses-id']);
});
