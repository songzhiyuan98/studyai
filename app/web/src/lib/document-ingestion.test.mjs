import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStableSegmentHash,
  segmentText,
} from './document-ingestion.ts';

test('segments text into stable source chunks with anchors', () => {
  const text = [
    'First paragraph has enough detail to keep as source context.',
    '',
    'Second paragraph continues the explanation with more material for a student.',
    '',
    'Third paragraph closes the idea.',
  ].join('\n');

  const segments = segmentText(text, {
    page: 2,
    chunkCharLimit: 90,
    chunkOverlap: 10,
  });

  assert.ok(segments.length >= 2);
  assert.equal(segments[0].page, 2);
  assert.equal(segments[0].charStart, 0);
  assert.ok(segments[0].charEnd > segments[0].charStart);
  assert.ok(segments.every((segment) => segment.content.trim() === segment.content));
});

test('creates stable segment hashes scoped by lecture and order', () => {
  const first = createStableSegmentHash('lecture_a', 'same content', 0);
  const second = createStableSegmentHash('lecture_a', 'same content', 0);
  const differentOrder = createStableSegmentHash('lecture_a', 'same content', 1);

  assert.equal(first, second);
  assert.notEqual(first, differentOrder);
});

test('segments preserve supplied page numbers', () => {
  const firstPage = segmentText('Page one has enough words to become a segment.', { page: 1 });
  const secondPage = segmentText('Page two has separate context and should keep its page anchor.', { page: 2 });

  assert.equal(firstPage[0].page, 1);
  assert.equal(secondPage[0].page, 2);
});
