export type ReaderSegmentApiRow = {
  id: string;
  text: string;
  tokenCount: number;
  page: number | null;
  slide: number | null;
  charStart: number | null;
  charEnd: number | null;
  createdAt: string | Date;
};

export type LectureDetailApiRow = {
  id: string;
  title: string;
  originalName: string;
  type: 'PDF' | 'PPTX' | 'TXT';
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  fileSize: number;
  createdAt: string | Date;
  folder?: {
    id: string;
    name: string;
  } | null;
  segments: ReaderSegmentApiRow[];
};

export type ReaderSegment = {
  id: string;
  text: string;
  tokenCount: number;
  page: number | null;
  slide: number | null;
  charStart: number | null;
  charEnd: number | null;
  sourceRef: string;
};

export type ReaderLecture = {
  id: string;
  title: string;
  originalName: string;
  type: string;
  status: string;
  metaLine: string;
  folderName: string;
  uploadedAt: string;
  segments: ReaderSegment[];
};

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function sortableNumber(value: number | null): number {
  return value ?? Number.MAX_SAFE_INTEGER;
}

export function formatSourceRef(segment: Pick<ReaderSegmentApiRow, 'id' | 'page' | 'slide'>): string {
  const location = segment.page
    ? `page ${segment.page}`
    : segment.slide
      ? `slide ${segment.slide}`
      : 'source';

  return `${location} · ${segment.id}`;
}

export function sortReaderSegments(segments: ReaderSegmentApiRow[]): ReaderSegmentApiRow[] {
  return [...segments].sort((first, second) => {
    const pageDiff = sortableNumber(first.page) - sortableNumber(second.page);
    if (pageDiff !== 0) return pageDiff;

    const slideDiff = sortableNumber(first.slide) - sortableNumber(second.slide);
    if (slideDiff !== 0) return slideDiff;

    const charDiff = sortableNumber(first.charStart) - sortableNumber(second.charStart);
    if (charDiff !== 0) return charDiff;

    return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  });
}

export function mapLectureDetailToReader(lecture: LectureDetailApiRow): ReaderLecture {
  const folderName = lecture.folder?.name || 'Unfiled';
  const uploadedAt = dateFormatter.format(new Date(lecture.createdAt));
  const sortedSegments = sortReaderSegments(lecture.segments);

  return {
    id: lecture.id,
    title: lecture.title,
    originalName: lecture.originalName,
    type: lecture.type,
    status: lecture.status,
    folderName,
    uploadedAt,
    metaLine: `${lecture.type} · ${folderName} · ${sortedSegments.length} segments · uploaded ${uploadedAt}`,
    segments: sortedSegments.map((segment) => ({
      id: segment.id,
      text: segment.text,
      tokenCount: segment.tokenCount,
      page: segment.page,
      slide: segment.slide,
      charStart: segment.charStart,
      charEnd: segment.charEnd,
      sourceRef: formatSourceRef(segment),
    })),
  };
}
