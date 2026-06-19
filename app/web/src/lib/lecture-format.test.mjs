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
