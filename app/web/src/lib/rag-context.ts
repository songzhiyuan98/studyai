export type RetrievalSegment = {
  id: string;
  lectureId: string;
  text: string;
  page: number | null;
  slide: number | null;
  charStart: number | null;
  charEnd: number | null;
};

export type RetrievedContext = {
  segment: RetrievalSegment;
  score: number;
  reason: 'lexical' | 'nearby';
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
]);

export function tokenizeForRetrieval(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}

function lexicalScore(queryTokens: string[], segmentText: string): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const segmentCounts = termFrequency(tokenizeForRetrieval(segmentText));
  const uniqueQueryTokens = Array.from(new Set(queryTokens));
  const overlap = uniqueQueryTokens.reduce((score, token) => {
    return score + Math.min(segmentCounts.get(token) || 0, 3);
  }, 0);

  return overlap / uniqueQueryTokens.length;
}

function nearbyScore(selectedSegments: RetrievalSegment[], segment: RetrievalSegment): number {
  const samePage = selectedSegments.some((selected) => (
    selected.page !== null
    && segment.page !== null
    && selected.page === segment.page
  ));
  if (samePage) {
    return 0.35;
  }

  const adjacentPage = selectedSegments.some((selected) => (
    selected.page !== null
    && segment.page !== null
    && Math.abs(selected.page - segment.page) === 1
  ));
  if (adjacentPage) {
    return 0.18;
  }

  return 0;
}

export function retrieveRelatedContext({
  selectedSegments,
  candidateSegments,
  limit = 4,
}: {
  selectedSegments: RetrievalSegment[];
  candidateSegments: RetrievalSegment[];
  limit?: number;
}): RetrievedContext[] {
  const selectedIds = new Set(selectedSegments.map((segment) => segment.id));
  const queryTokens = tokenizeForRetrieval(selectedSegments.map((segment) => segment.text).join(' '));

  return candidateSegments
    .filter((segment) => !selectedIds.has(segment.id))
    .map((segment) => {
      const lexical = lexicalScore(queryTokens, segment.text);
      const nearby = nearbyScore(selectedSegments, segment);
      return {
        segment,
        score: lexical + nearby,
        reason: lexical >= nearby ? 'lexical' : 'nearby',
      } satisfies RetrievedContext;
    })
    .filter((result) => result.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return (first.segment.page || 0) - (second.segment.page || 0);
    })
    .slice(0, limit);
}

export function compactContextText(segments: RetrievalSegment[], maxChars = 900): string {
  const joined = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(' ');

  return joined.length > maxChars ? `${joined.slice(0, maxChars - 3)}...` : joined;
}
