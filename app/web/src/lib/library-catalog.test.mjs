import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLibraryScope } from './library-catalog.ts';

const lectures = [
  {
    id: 'lambda-id',
    title: 'lambda',
    originalName: 'lambda.pdf',
    courseId: null,
    folder: { id: 'cse-114a', name: 'CSE 114A' },
    type: 'PDF',
  },
  {
    id: 'types-id',
    title: 'types',
    originalName: 'types.pdf',
    courseId: null,
    folder: { id: 'cse-114a', name: 'CSE 114A' },
    type: 'PDF',
  },
  {
    id: 'typeclasses-id',
    title: 'typeclasses',
    originalName: 'typeclasses.pdf',
    courseId: null,
    folder: { id: 'cse-114a', name: 'CSE 114A' },
    type: 'PDF',
  },
  {
    id: 'writing-id',
    title: 'essay planning',
    originalName: 'essay.pdf',
    courseId: null,
    folder: { id: 'writing', name: 'Writing 101' },
    type: 'PDF',
  },
];

test('manual source selection wins before catalog inference', () => {
  const scoped = resolveLibraryScope({
    lectures,
    query: '我想复习 114a',
    explicitLectureIds: ['types-id'],
  });

  assert.equal(scoped.source, 'selected_sources');
  assert.equal(scoped.confidence, 'high');
  assert.equal(scoped.needsConfirmation, false);
  assert.deepEqual(scoped.lectureIds, ['types-id']);
});

test('course-like folder labels select the whole course material scope', () => {
  const scoped = resolveLibraryScope({
    lectures,
    query: '我马上要考 114a，帮我整理一份模拟 midterm 测试',
  });

  assert.equal(scoped.narrowed, true);
  assert.equal(scoped.source, 'course');
  assert.deepEqual(scoped.lectureIds, ['lambda-id', 'types-id', 'typeclasses-id']);
  assert.deepEqual(scoped.matchedLabels, ['CSE 114A']);
});

test('specific lecture titles narrow to one material', () => {
  const scoped = resolveLibraryScope({
    lectures,
    query: '我想把 lambda 这一份 lecture 学明白',
  });

  assert.equal(scoped.narrowed, true);
  assert.equal(scoped.source, 'lecture_title');
  assert.deepEqual(scoped.lectureIds, ['lambda-id']);
});

test('unmatched requests keep all ready materials available', () => {
  const scoped = resolveLibraryScope({
    lectures,
    query: '今天随便带我复习一下',
  });

  assert.equal(scoped.narrowed, false);
  assert.equal(scoped.source, 'all_ready');
  assert.deepEqual(scoped.lectureIds, lectures.map((lecture) => lecture.id));
});
