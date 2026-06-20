import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLessonMemoryToPlan,
  buildLessonMemoryFromRetrieval,
  parseChatSessionMemory,
  resolveInheritedLessonScope,
} from './chat-session-memory.ts';

test('inherits the previous lesson scope for continuation turns', () => {
  const memory = parseChatSessionMemory({
    version: 1,
    lessonState: {
      lectureIds: ['lambda', 'types'],
      contextStrategy: 'long_document_map',
      retrievalBreadth: 'broad_lesson',
      matchedLabels: ['CSE 114A'],
      nextStep: 'Continue with typeclass examples.',
    },
  });

  const inherited = resolveInheritedLessonScope({
    explicitLectureIds: undefined,
    memory,
    message: '继续，讲下一个点',
  });

  assert.equal(inherited.inherited, true);
  assert.deepEqual(inherited.lectureIds, ['lambda', 'types']);
  assert.equal(inherited.reason, 'continuation_turn');
});

test('does not override an explicit user-selected source scope', () => {
  const memory = parseChatSessionMemory({
    version: 1,
    lessonState: {
      lectureIds: ['lambda', 'types'],
      contextStrategy: 'long_document_map',
      retrievalBreadth: 'broad_lesson',
    },
  });

  const inherited = resolveInheritedLessonScope({
    explicitLectureIds: ['typeclasses'],
    memory,
    message: '继续',
  });

  assert.equal(inherited.inherited, false);
  assert.deepEqual(inherited.lectureIds, ['typeclasses']);
  assert.equal(inherited.reason, 'explicit_scope');
});

test('continuation turns reuse the previous teaching strategy', () => {
  const memory = parseChatSessionMemory({
    version: 1,
    lessonState: {
      lectureIds: ['lambda'],
      contextStrategy: 'long_document_map',
      retrievalBreadth: 'broad_lesson',
      matchedLabels: ['lambda'],
    },
  });
  const plan = applyLessonMemoryToPlan({
    plan: {
      intent: 'retrieval_answer',
      requiresRetrieval: true,
      retrievalBreadth: 'focused',
      contextStrategy: 'focused_rag',
      teacherModeHint: false,
      delegatedAgent: 'teaching_agent',
      requestedPage: null,
      requiresConfirmation: false,
      tools: [],
      plannerSource: 'deterministic',
    },
    memory,
    message: '再讲一下',
    inheritedScope: true,
  });

  assert.equal(plan.intent, 'guided_learning');
  assert.equal(plan.retrievalBreadth, 'broad_lesson');
  assert.equal(plan.contextStrategy, 'long_document_map');
  assert.equal(plan.teacherModeHint, true);
  assert.equal(plan.delegatedAgent, 'teaching_agent');
});

test('builds structured lesson memory from a source-grounded answer', () => {
  const memory = buildLessonMemoryFromRetrieval({
    previousMemory: null,
    message: '我要学习一下 cse114 的 lecture',
    retrieval: {
      contextStrategy: 'long_document_map',
      retrievalBreadth: 'broad_lesson',
      sourceScope: 'lecture_title',
      contextCoverageLabel: 'long-document map coverage',
      libraryScope: {
        matchedLabels: ['lambda', 'types'],
        confidence: 'high',
        reason: 'Matched course files.',
      },
    },
    lectureIds: ['lambda-id', 'types-id'],
    sourceMaterials: [
      { title: 'lambda', detail: 'CSE 114A · PDF', count: 100 },
      { title: 'types', detail: 'CSE 114A · PDF', count: 59 },
    ],
  });

  assert.equal(memory.version, 1);
  assert.deepEqual(memory.lessonState?.lectureIds, ['lambda-id', 'types-id']);
  assert.equal(memory.lessonState?.contextStrategy, 'long_document_map');
  assert.equal(memory.lessonState?.retrievalBreadth, 'broad_lesson');
  assert.deepEqual(memory.lessonState?.matchedLabels, ['lambda', 'types']);
  assert.match(memory.lessonState?.nextStep || '', /continue/i);
  assert.equal(memory.lessonState?.language, 'Chinese');
});
