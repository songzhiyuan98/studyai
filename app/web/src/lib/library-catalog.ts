export type LibraryCatalogLecture = {
  id: string;
  title: string;
  originalName?: string | null;
  courseId?: string | null;
  type?: string | null;
  folder?: {
    id?: string | null;
    name: string;
  } | null;
};

export type LibraryScopeSource =
  | 'selected_sources'
  | 'folder'
  | 'course'
  | 'lecture_title'
  | 'all_ready'
  | 'none';

export type LibraryScopeResolution<TLecture extends LibraryCatalogLecture> = {
  lectures: TLecture[];
  lectureIds: string[];
  narrowed: boolean;
  source: LibraryScopeSource;
  confidence: 'high' | 'medium' | 'low';
  needsConfirmation: boolean;
  reason: string;
  matchedLabels: string[];
};

const GENERIC_LIBRARY_TOKENS = new Set([
  'chapter',
  'class',
  'course',
  'document',
  'file',
  'final',
  'intro',
  'introduction',
  'lecture',
  'lesson',
  'material',
  'midterm',
  'mock',
  'note',
  'notes',
  'pdf',
  'practice',
  'review',
  'slide',
  'slides',
  'source',
  'study',
  'test',
]);

function normalizeCatalogText(text: string) {
  return text
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeCatalogText(text: string) {
  return normalizeCatalogText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function significantTokens(text: string) {
  return tokenizeCatalogText(text)
    .filter((token) => token.length >= 3 && !GENERIC_LIBRARY_TOKENS.has(token));
}

function courseLikeTokens(text: string) {
  const normalized = normalizeCatalogText(text);
  const compact = normalized.replace(/\s+/g, '');
  const tokens = new Set<string>();

  tokenizeCatalogText(text).forEach((token) => {
    if (/\d/.test(token)) {
      tokens.add(token);
    }
  });

  const courseMatches = compact.match(/[a-z]{2,}\d{2,4}[a-z]?|\d{2,4}[a-z]?/g) || [];
  courseMatches.forEach((match) => tokens.add(match));

  return Array.from(tokens);
}

function hasExactTextMatch(query: string, target: string) {
  const normalizedTarget = normalizeCatalogText(target);

  return normalizedTarget.length >= 3 && query.includes(normalizedTarget);
}

function countTokenMatches(queryTokens: Set<string>, targetTokens: string[]) {
  return targetTokens.reduce((count, token) => (
    queryTokens.has(token) ? count + 1 : count
  ), 0);
}

function uniqueLectures<TLecture extends LibraryCatalogLecture>(lectures: TLecture[]) {
  const seen = new Set<string>();

  return lectures.filter((lecture) => {
    if (seen.has(lecture.id)) {
      return false;
    }

    seen.add(lecture.id);
    return true;
  });
}

export function resolveLibraryScope<TLecture extends LibraryCatalogLecture>({
  lectures,
  query,
  explicitLectureIds,
}: {
  lectures: TLecture[];
  query: string;
  explicitLectureIds?: string[];
}): LibraryScopeResolution<TLecture> {
  const explicitIds = explicitLectureIds?.length
    ? new Set(explicitLectureIds)
    : null;

  if (explicitIds) {
    const selectedLectures = lectures.filter((lecture) => explicitIds.has(lecture.id));

    return {
      lectures: selectedLectures,
      lectureIds: selectedLectures.map((lecture) => lecture.id),
      narrowed: true,
      source: 'selected_sources',
      confidence: 'high',
      needsConfirmation: false,
      reason: 'The student manually selected the source scope.',
      matchedLabels: selectedLectures.map((lecture) => lecture.title),
    };
  }

  const normalizedQuery = normalizeCatalogText(query);
  const queryTokens = new Set(tokenizeCatalogText(query));
  const queryCourseTokens = new Set(courseLikeTokens(query));

  const folderMatches = new Map<string, { label: string; lectures: TLecture[]; score: number }>();
  lectures.forEach((lecture) => {
    const folderLabel = lecture.folder?.name || '';
    const folderKey = lecture.folder?.id || folderLabel;
    if (!folderLabel || !folderKey) return;

    const folderTokens = significantTokens(folderLabel);
    const folderCourseTokens = courseLikeTokens(folderLabel);
    const courseTokens = courseLikeTokens(lecture.courseId || '');
    const exactFolder = hasExactTextMatch(normalizedQuery, folderLabel);
    const courseHits = [...folderCourseTokens, ...courseTokens].filter((token) => (
      queryTokens.has(token) || queryCourseTokens.has(token)
    )).length;
    const tokenHits = countTokenMatches(queryTokens, folderTokens);
    const score = (exactFolder ? 4 : 0) + courseHits * 3 + tokenHits;

    if (score <= 0) return;

    const current = folderMatches.get(folderKey);
    if (current) {
      current.score = Math.max(current.score, score);
      current.lectures.push(lecture);
    } else {
      folderMatches.set(folderKey, {
        label: folderLabel,
        lectures: [lecture],
        score,
      });
    }
  });

  const strongFolderMatches = Array.from(folderMatches.values())
    .filter((match) => match.score >= 2)
    .sort((first, second) => second.score - first.score);
  if (strongFolderMatches.length > 0) {
    const matchedLectures = uniqueLectures(strongFolderMatches.flatMap((match) => match.lectures));

    return {
      lectures: matchedLectures,
      lectureIds: matchedLectures.map((lecture) => lecture.id),
      narrowed: true,
      source: strongFolderMatches.some((match) => courseLikeTokens(match.label).some((token) => queryCourseTokens.has(token)))
        ? 'course'
        : 'folder',
      confidence: strongFolderMatches.length === 1 ? 'high' : 'medium',
      needsConfirmation: strongFolderMatches.length > 1,
      reason: 'The planner matched the request against Library folders and course labels before retrieval.',
      matchedLabels: strongFolderMatches.map((match) => match.label),
    };
  }

  const titleMatches = lectures
    .map((lecture) => {
      const text = [lecture.title, lecture.originalName || '', lecture.courseId || ''].join(' ');
      const exactTitle = hasExactTextMatch(normalizedQuery, lecture.title);
      const titleHits = countTokenMatches(queryTokens, significantTokens(text));
      const courseHits = courseLikeTokens(text).filter((token) => (
        queryTokens.has(token) || queryCourseTokens.has(token)
      )).length;

      return {
        lecture,
        score: (exactTitle ? 4 : 0) + titleHits + courseHits * 2,
      };
    })
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score);

  if (titleMatches.length > 0) {
    const topScore = titleMatches[0].score;
    const matchedLectures = uniqueLectures(
      titleMatches
        .filter((match) => match.score === topScore || match.score >= 3)
        .map((match) => match.lecture),
    );

    return {
      lectures: matchedLectures,
      lectureIds: matchedLectures.map((lecture) => lecture.id),
      narrowed: true,
      source: 'lecture_title',
      confidence: matchedLectures.length === 1 ? 'high' : 'medium',
      needsConfirmation: matchedLectures.length > 1,
      reason: 'The planner matched the request against Library file titles before retrieval.',
      matchedLabels: matchedLectures.map((lecture) => lecture.title),
    };
  }

  return {
    lectures,
    lectureIds: lectures.map((lecture) => lecture.id),
    narrowed: false,
    source: lectures.length > 0 ? 'all_ready' : 'none',
    confidence: 'low',
    needsConfirmation: false,
    reason: 'No folder, course, or file title clearly matched, so retrieval can use all ready Library materials.',
    matchedLabels: [],
  };
}
