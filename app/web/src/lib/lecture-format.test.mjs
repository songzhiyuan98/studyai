import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatFileSize,
  hasIndexingLectures,
  mapLectureToLibraryItem,
  visibleLibraryItems,
} from './lecture-format.ts';

const apiLecture = {
  id: 'lec_1',
  title: 'Linear Regression',
  originalName: 'linear-regression.pdf',
  type: 'PDF',
  status: 'PROCESSED',
  fileSize: 1536,
  createdAt: '2026-06-19T19:00:00.000Z',
  folderId: 'folder_ml',
  folder: { id: 'folder_ml', name: 'Machine Learning' },
  meta: {
    embeddingStatus: 'completed',
    embeddedSegmentCount: 12,
  },
  _count: { segments: 12 },
};

test('formats lecture API rows for the library UI', () => {
  assert.deepEqual(mapLectureToLibraryItem(apiLecture), {
    id: 'lec_1',
    title: 'Linear Regression',
    originalName: 'linear-regression.pdf',
    type: 'PDF',
    status: 'Processed',
    fileSize: '1.5 KB',
    folderId: 'folder_ml',
    folderName: 'Machine Learning',
    segments: 12,
    vectorStatus: 'Vector ready',
    needsVectorReindex: false,
    uploadedAt: 'Jun 19, 2026',
  });
});

test('filters visible library items by selected folder and search query', () => {
  const items = [
    mapLectureToLibraryItem(apiLecture),
    mapLectureToLibraryItem({
      ...apiLecture,
      id: 'lec_2',
      title: 'Graph Search Notes',
      originalName: 'graphs.txt',
      type: 'TXT',
      folderId: 'folder_algo',
      folder: { id: 'folder_algo', name: 'Algorithms' },
    }),
  ];

  assert.equal(visibleLibraryItems(items, 'folder_ml', '').length, 1);
  assert.equal(visibleLibraryItems(items, 'all', 'graph').length, 1);
  assert.equal(visibleLibraryItems(items, 'all', 'missing').length, 0);
});

test('formats file sizes with stable desktop-friendly units', () => {
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB');
});

test('detects lectures that still need indexing refreshes', () => {
  assert.equal(hasIndexingLectures([apiLecture]), false);
  assert.equal(hasIndexingLectures([{ ...apiLecture, status: 'PENDING' }]), true);
  assert.equal(hasIndexingLectures([{ ...apiLecture, status: 'PROCESSING' }]), true);
  assert.equal(hasIndexingLectures([{ ...apiLecture, status: 'FAILED' }]), false);
});

test('formats vector indexing status for library rows', () => {
  assert.equal(mapLectureToLibraryItem({
    ...apiLecture,
    meta: { embeddingStatus: 'disabled', embeddedSegmentCount: 0 },
  }).vectorStatus, 'Lexical ready');

  const partialItem = mapLectureToLibraryItem({
    ...apiLecture,
    meta: { embeddingStatus: 'completed', embeddedSegmentCount: 4 },
  });
  assert.equal(partialItem.vectorStatus, 'Partial vectors');
  assert.equal(partialItem.needsVectorReindex, true);

  const failedItem = mapLectureToLibraryItem({
    ...apiLecture,
    meta: { embeddingStatus: 'failed', embeddedSegmentCount: 0 },
  });
  assert.equal(failedItem.vectorStatus, 'Needs vector index');
  assert.equal(failedItem.needsVectorReindex, true);
});

test('formats empty source rows as passages instead of chunks', () => {
  const item = mapLectureToLibraryItem({
    ...apiLecture,
    meta: { embeddingStatus: 'disabled', embeddedSegmentCount: 0 },
    _count: { segments: 0 },
  });

  assert.equal(item.vectorStatus, 'No passages yet');
  assert.notEqual(item.vectorStatus, 'No chunks yet');
});
