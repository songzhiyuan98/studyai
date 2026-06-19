export type LectureApiRow = {
  id: string;
  title: string;
  originalName: string;
  type: 'PDF' | 'PPTX' | 'TXT';
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  fileSize: number;
  createdAt: string | Date;
  folderId: string;
  folder?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    segments?: number;
  };
};

export type LibraryItem = {
  id: string;
  title: string;
  originalName: string;
  type: string;
  status: string;
  fileSize: string;
  folderId: string;
  folderName: string;
  segments: number;
  uploadedAt: string;
};

const statusLabels: Record<LectureApiRow['status'], string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  FAILED: 'Failed',
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapLectureToLibraryItem(lecture: LectureApiRow): LibraryItem {
  return {
    id: lecture.id,
    title: lecture.title,
    originalName: lecture.originalName,
    type: lecture.type,
    status: statusLabels[lecture.status],
    fileSize: formatFileSize(lecture.fileSize),
    folderId: lecture.folderId,
    folderName: lecture.folder?.name || 'Unfiled',
    segments: lecture._count?.segments || 0,
    uploadedAt: new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(lecture.createdAt)),
  };
}

export function hasIndexingLectures(lectures: LectureApiRow[]): boolean {
  return lectures.some((lecture) => lecture.status === 'PENDING' || lecture.status === 'PROCESSING');
}

export function visibleLibraryItems(
  items: LibraryItem[],
  selectedFolderId: string,
  searchQuery: string,
): LibraryItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const folderMatches = selectedFolderId === 'all' || item.folderId === selectedFolderId;
    const queryMatches = !normalizedQuery
      || item.title.toLowerCase().includes(normalizedQuery)
      || item.originalName.toLowerCase().includes(normalizedQuery)
      || item.folderName.toLowerCase().includes(normalizedQuery);

    return folderMatches && queryMatches;
  });
}
