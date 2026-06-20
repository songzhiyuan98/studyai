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
  reason: 'lexical' | 'nearby' | 'vector' | 'hybrid';
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

export function retrieveContextForQuery({
  query,
  candidateSegments,
  limit = 6,
}: {
  query: string;
  candidateSegments: RetrievalSegment[];
  limit?: number;
}): RetrievedContext[] {
  const queryTokens = tokenizeForRetrieval(query);

  return candidateSegments
    .map((segment) => ({
      segment,
      score: lexicalScore(queryTokens, segment.text),
      reason: 'lexical' as const,
    }))
    .filter((result) => result.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      const lectureDiff = first.segment.lectureId.localeCompare(second.segment.lectureId);
      if (lectureDiff !== 0) {
        return lectureDiff;
      }

      return (first.segment.page || 0) - (second.segment.page || 0);
    })
    .slice(0, limit);
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function parseChinesePageNumber(value: string) {
  if (value === '十') return 10;

  if (value.includes('十')) {
    const [tensRaw, onesRaw] = value.split('十');
    const tens = tensRaw ? CHINESE_DIGITS[tensRaw] : 1;
    const ones = onesRaw ? CHINESE_DIGITS[onesRaw] : 0;

    if (tens === undefined || ones === undefined) return null;
    return tens * 10 + ones;
  }

  return CHINESE_DIGITS[value] ?? null;
}

export function extractRequestedPageNumber(query: string) {
  const numericMatch = query.match(/\b(?:page|p\.?)\s*(\d{1,4})\b/i)
    || query.match(/第\s*(\d{1,4})\s*页/);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  const chineseMatch = query.match(/第\s*([零一二两三四五六七八九十]{1,4})\s*页/);
  if (chineseMatch) {
    return parseChinesePageNumber(chineseMatch[1]);
  }

  return null;
}

export function retrieveContextForPageRequest({
  query,
  candidateSegments,
  limit = 6,
}: {
  query: string;
  candidateSegments: RetrievalSegment[];
  limit?: number;
}): RetrievedContext[] {
  const requestedPage = extractRequestedPageNumber(query);
  if (!requestedPage) {
    return [];
  }

  return candidateSegments
    .filter((segment) => segment.page === requestedPage)
    .sort((first, second) => (first.charStart || 0) - (second.charStart || 0))
    .slice(0, limit)
    .map((segment, index) => ({
      segment,
      score: 1 - index * 0.01,
      reason: 'nearby' as const,
    }));
}

function selectDiverseSegments(segments: RetrievalSegment[], count: number) {
  if (segments.length <= count) {
    return segments;
  }

  const selected: RetrievalSegment[] = [];
  const usedIds = new Set<string>();
  const orderedByPage = [...segments].sort((first, second) => {
    const pageDiff = (first.page || 0) - (second.page || 0);
    if (pageDiff !== 0) return pageDiff;
    return (first.charStart || 0) - (second.charStart || 0);
  });

  for (let index = 0; index < count; index += 1) {
    const sampleIndex = Math.min(
      orderedByPage.length - 1,
      Math.round((index * (orderedByPage.length - 1)) / Math.max(1, count - 1)),
    );
    const segment = orderedByPage[sampleIndex];
    if (!usedIds.has(segment.id)) {
      selected.push(segment);
      usedIds.add(segment.id);
    }
  }

  for (const segment of orderedByPage) {
    if (selected.length >= count) break;
    if (!usedIds.has(segment.id)) {
      selected.push(segment);
      usedIds.add(segment.id);
    }
  }

  return selected;
}

export function retrieveBroadCoverageContext({
  query,
  candidateSegments,
  perLecture = 4,
  limit = 16,
}: {
  query: string;
  candidateSegments: RetrievalSegment[];
  perLecture?: number;
  limit?: number;
}): RetrievedContext[] {
  const groupedByLecture = new Map<string, RetrievalSegment[]>();
  candidateSegments.forEach((segment) => {
    const current = groupedByLecture.get(segment.lectureId) || [];
    current.push(segment);
    groupedByLecture.set(segment.lectureId, current);
  });

  const selected: RetrievedContext[] = [];
  groupedByLecture.forEach((segments) => {
    const lexical = retrieveContextForQuery({
      query,
      candidateSegments: segments,
      limit: perLecture,
    });
    const usedIds = new Set(lexical.map((result) => result.segment.id));
    const diverse = selectDiverseSegments(
      segments.filter((segment) => !usedIds.has(segment.id)),
      Math.max(0, perLecture - lexical.length),
    ).map((segment, index) => ({
      segment,
      score: 0.5 - index * 0.01,
      reason: 'nearby' as const,
    }));

    selected.push(...lexical, ...diverse);
  });

  return selected
    .sort((first, second) => {
      const lectureDiff = first.segment.lectureId.localeCompare(second.segment.lectureId);
      if (lectureDiff !== 0) return lectureDiff;
      const pageDiff = (first.segment.page || 0) - (second.segment.page || 0);
      if (pageDiff !== 0) return pageDiff;
      return (first.segment.charStart || 0) - (second.segment.charStart || 0);
    })
    .slice(0, limit);
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

export function mergeHybridContext({
  vectorResults,
  lexicalResults,
  limit = 6,
}: {
  vectorResults: RetrievedContext[];
  lexicalResults: RetrievedContext[];
  limit?: number;
}): RetrievedContext[] {
  const merged = new Map<string, {
    segment: RetrievalSegment;
    score: number;
    vectorRank?: number;
    lexicalRank?: number;
  }>();

  vectorResults.forEach((result, index) => {
    merged.set(result.segment.id, {
      segment: result.segment,
      score: result.score + 1 / (index + 1),
      vectorRank: index + 1,
    });
  });

  lexicalResults.forEach((result, index) => {
    const existing = merged.get(result.segment.id);
    const lexicalBoost = result.score + 1 / (index + 1);

    if (existing) {
      existing.score += lexicalBoost;
      existing.lexicalRank = index + 1;
      return;
    }

    merged.set(result.segment.id, {
      segment: result.segment,
      score: lexicalBoost,
      lexicalRank: index + 1,
    });
  });

  return Array.from(merged.values())
    .map((result) => ({
      segment: result.segment,
      score: Number(result.score.toFixed(6)),
      reason: result.vectorRank && result.lexicalRank
        ? 'hybrid'
        : result.vectorRank
          ? 'vector'
          : 'lexical',
    }) satisfies RetrievedContext)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.segment.id.localeCompare(second.segment.id);
    })
    .slice(0, limit);
}

function compareSourceOrder(first: RetrievalSegment, second: RetrievalSegment) {
  const lectureDiff = first.lectureId.localeCompare(second.lectureId);
  if (lectureDiff !== 0) return lectureDiff;
  const pageDiff = (first.page || 0) - (second.page || 0);
  if (pageDiff !== 0) return pageDiff;
  const slideDiff = (first.slide || 0) - (second.slide || 0);
  if (slideDiff !== 0) return slideDiff;
  return (first.charStart || 0) - (second.charStart || 0);
}

export function expandRetrievedContextWithNeighbors({
  retrieved,
  candidateSegments,
  neighborsPerSeed = 1,
  limit = 10,
}: {
  retrieved: RetrievedContext[];
  candidateSegments: RetrievalSegment[];
  neighborsPerSeed?: number;
  limit?: number;
}): RetrievedContext[] {
  if (retrieved.length === 0 || neighborsPerSeed <= 0) {
    return retrieved.slice(0, limit);
  }

  const orderedSegments = [...candidateSegments].sort(compareSourceOrder);
  const candidateIndexById = new Map(orderedSegments.map((segment, index) => [segment.id, index]));
  const selected = new Map<string, RetrievedContext>();

  retrieved.forEach((result) => {
    selected.set(result.segment.id, result);
    const seedIndex = candidateIndexById.get(result.segment.id);
    if (seedIndex === undefined) return;

    for (let offset = -neighborsPerSeed; offset <= neighborsPerSeed; offset += 1) {
      if (offset === 0) continue;

      const neighbor = orderedSegments[seedIndex + offset];
      if (!neighbor || neighbor.lectureId !== result.segment.lectureId || selected.has(neighbor.id)) {
        continue;
      }

      selected.set(neighbor.id, {
        segment: neighbor,
        score: Math.max(0.01, result.score - Math.abs(offset) * 0.05),
        reason: 'nearby',
      });
    }
  });

  return Array.from(selected.values())
    .sort((first, second) => compareSourceOrder(first.segment, second.segment))
    .slice(0, limit);
}

function tokenSetForSimilarity(text: string) {
  return new Set(tokenizeForRetrieval(text));
}

function jaccardSimilarity(first: Set<string>, second: Set<string>) {
  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  let overlap = 0;
  first.forEach((token) => {
    if (second.has(token)) {
      overlap += 1;
    }
  });

  return overlap / (first.size + second.size - overlap);
}

export function dedupeRetrievedContext({
  results,
  limit = 6,
  similarityThreshold = 0.78,
}: {
  results: RetrievedContext[];
  limit?: number;
  similarityThreshold?: number;
}): RetrievedContext[] {
  const selected: Array<RetrievedContext & { tokens: Set<string> }> = [];
  const ranked = [...results].sort((first, second) => {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    return first.segment.id.localeCompare(second.segment.id);
  });

  for (const result of ranked) {
    if (selected.length >= limit) break;

    const tokens = tokenSetForSimilarity(result.segment.text);
    const duplicate = selected.some((existing) => (
      jaccardSimilarity(existing.tokens, tokens) >= similarityThreshold
    ));

    if (!duplicate) {
      selected.push({ ...result, tokens });
    }
  }

  return selected.map(({ tokens, ...result }) => result);
}

export function compactContextText(segments: RetrievalSegment[], maxChars = 900): string {
  const joined = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(' ');

  return joined.length > maxChars ? `${joined.slice(0, maxChars - 3)}...` : joined;
}
