import assert from 'node:assert/strict';
import test from 'node:test';
import { inferLibraryOperationDraft } from './chat-library-tools.ts';

test('infers delete library operation drafts', () => {
  const draft = inferLibraryOperationDraft('删除 lambda.pdf 这个文件');

  assert.equal(draft.action, 'delete');
  assert.equal(draft.requiresConfirmation, true);
  assert.equal(draft.targetLabel, 'lambda.pdf');
});

test('infers rename and move library operation drafts', () => {
  const renameDraft = inferLibraryOperationDraft('rename lambda to lambda calculus notes');
  const moveDraft = inferLibraryOperationDraft('move typeclasses.pdf to CSE 114A');

  assert.equal(renameDraft.action, 'rename');
  assert.equal(renameDraft.targetLabel, 'lambda');
  assert.equal(renameDraft.destinationLabel, 'lambda calculus notes');
  assert.equal(moveDraft.action, 'move');
  assert.equal(moveDraft.targetLabel, 'typeclasses.pdf');
  assert.equal(moveDraft.destinationLabel, 'CSE 114A');
});

test('infers Chinese rename and move operation details', () => {
  const renameDraft = inferLibraryOperationDraft('把 lambda 改名为 lambda calculus');
  const moveDraft = inferLibraryOperationDraft('把 typeclasses.pdf 放进 CSE 114A 文件夹');

  assert.equal(renameDraft.action, 'rename');
  assert.equal(renameDraft.targetLabel, 'lambda');
  assert.equal(renameDraft.destinationLabel, 'lambda calculus');
  assert.equal(moveDraft.action, 'move');
  assert.equal(moveDraft.targetLabel, 'typeclasses.pdf');
  assert.equal(moveDraft.destinationLabel, 'CSE 114A');
});

test('infers upload library operation drafts without pretending a file exists', () => {
  const draft = inferLibraryOperationDraft('我想上传一个新的 lecture 到 114a');

  assert.equal(draft.action, 'upload');
  assert.equal(draft.targetLabel, 'new source file');
  assert.equal(draft.requiresConfirmation, true);
});
