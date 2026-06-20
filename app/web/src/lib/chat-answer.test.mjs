import assert from 'node:assert/strict';
import test from 'node:test';
import { buildChatAnswer, chatModeLabels } from './chat-answer.ts';

const contextText = 'Haskell functions are first-class values. Pattern matching chooses the first matching equation. Top-level bindings name reusable values.';

test('exposes labels for chat study modes', () => {
  assert.equal(chatModeLabels.free, 'Study answer');
  assert.equal(chatModeLabels.mini_quiz, 'Mini quiz');
  assert.equal(chatModeLabels.cheat_sheet, 'Cheat sheet draft');
});

test('builds mini quiz output with evidence and application prompts', () => {
  const answer = buildChatAnswer({
    mode: 'mini_quiz',
    message: 'Help me review Haskell functions',
    contextText,
  });

  assert.match(answer, /Concept check/);
  assert.match(answer, /Evidence check/);
  assert.match(answer, /Source notes considered/);
});

test('builds cheat sheet output with must-know bullets', () => {
  const answer = buildChatAnswer({
    mode: 'cheat_sheet',
    message: 'Make a cheat sheet',
    contextText,
  });

  assert.match(answer, /Must know/);
  assert.match(answer, /Quick recall prompts/);
  assert.match(answer, /Pattern matching/);
});

test('builds summary output as scannable bullets', () => {
  const answer = buildChatAnswer({
    mode: 'summarize',
    message: 'Summarize this lecture',
    contextText,
  });

  assert.match(answer, /compact summary/);
  assert.match(answer, /- Haskell functions/);
});

test('builds free chat fallback like a gradual tutor response', () => {
  const answer = buildChatAnswer({
    mode: 'free',
    message: 'Explain Haskell functions',
    contextText,
  });

  assert.match(answer, /Let's start with the core idea/);
  assert.match(answer, /What part should we unpack next/);
  assert.doesNotMatch(answer, /mini quiz/i);
  assert.doesNotMatch(answer, /cheat sheet/i);
  assert.doesNotMatch(answer, /Here is a grounded study response/);
});
