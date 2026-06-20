import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeReaderSearchText,
  scoreReaderLectureMatch,
} from './chat-reader-tools.ts';

test('normalizes reader search text across punctuation and case', () => {
  assert.equal(normalizeReaderSearchText('Lambda-Calculus.pdf'), 'lambda calculus pdf');
  assert.equal(normalizeReaderSearchText('打开第 9 页'), '打开第 9 页');
});

test('scores direct lecture title matches above token matches', () => {
  assert.equal(scoreReaderLectureMatch({
    message: 'open lambda calculus page 3',
    title: 'Lambda Calculus',
  }), 4);

  assert.equal(scoreReaderLectureMatch({
    message: 'open lambda notes',
    title: 'Lambda Calculus',
  }), 2);
});

test('scores original file names course ids and folder labels', () => {
  assert.equal(scoreReaderLectureMatch({
    message: '打开 CSE 114A 的 typeclasses 文件',
    title: 'Typeclasses',
    originalName: 'typeclasses.pdf',
    courseId: 'CSE 114A',
    folderName: 'CSE',
  }), 4);
});
