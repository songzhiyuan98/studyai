export type LectureScopeCandidate = {
  id: string;
  title: string;
  folder?: {
    name: string;
  } | null;
};

const GENERIC_TITLE_TOKENS = new Set([
  'chapter',
  'course',
  'intro',
  'introduction',
  'lecture',
  'notes',
  'pdf',
  'slides',
  'study',
]);

function tokenizeScopeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function getSignificantTitleTokens(title: string) {
  return tokenizeScopeText(title)
    .filter((token) => token.length >= 4 && !GENERIC_TITLE_TOKENS.has(token));
}

export function resolveExplicitLectureScope<TLecture extends LectureScopeCandidate>({
  lectures,
  query,
}: {
  lectures: TLecture[];
  query: string;
}) {
  const normalizedQuery = query.toLowerCase();
  const queryTokens = new Set(tokenizeScopeText(query));
  const matchedLectures = lectures.filter((lecture) => {
    const normalizedTitle = lecture.title.toLowerCase().trim();
    const titleTokens = getSignificantTitleTokens(lecture.title);

    if (normalizedTitle.length >= 4 && normalizedQuery.includes(normalizedTitle)) {
      return true;
    }

    return titleTokens.some((token) => queryTokens.has(token));
  });

  return {
    lectures: matchedLectures.length > 0 ? matchedLectures : lectures,
    lectureIds: matchedLectures.map((lecture) => lecture.id),
    narrowed: matchedLectures.length > 0,
  };
}
