import type { RetrievalSegment } from './rag-context';

function getSegmentPosition(segment: RetrievalSegment) {
  return {
    page: segment.page ?? Number.MAX_SAFE_INTEGER,
    slide: segment.slide ?? Number.MAX_SAFE_INTEGER,
    charStart: segment.charStart ?? Number.MAX_SAFE_INTEGER,
  };
}

function formatPackLabel(
  segment: RetrievalSegment,
  lectureLabels: Record<string, string>,
) {
  const sourceLabel = lectureLabels[segment.lectureId] || segment.lectureId;

  if (segment.page) {
    return `${sourceLabel} · page ${segment.page}`;
  }

  if (segment.slide) {
    return `${sourceLabel} · slide ${segment.slide}`;
  }

  return `${sourceLabel} · source`;
}

function buildSegmentBlock(
  segment: RetrievalSegment,
  lectureLabels: Record<string, string>,
) {
  return `[${formatPackLabel(segment, lectureLabels)}]\n${segment.text.trim()}`;
}

function appendSegmentBlock({
  segment,
  contextParts,
  selectedSegments,
  usedChars,
  maxChars,
  lectureLabels,
}: {
  segment: RetrievalSegment;
  contextParts: string[];
  selectedSegments: RetrievalSegment[];
  usedChars: number;
  maxChars: number;
  lectureLabels: Record<string, string>;
}) {
  const block = buildSegmentBlock(segment, lectureLabels);
  const blockLength = block.length + (contextParts.length > 0 ? 2 : 0);

  if (contextParts.length > 0 && usedChars + blockLength > maxChars) {
    return { added: false, usedChars };
  }

  if (contextParts.length === 0 && block.length > maxChars) {
    const truncatedBlock = block.slice(0, Math.max(0, maxChars - 1)).trimEnd();
    contextParts.push(`${truncatedBlock}…`);
    selectedSegments.push(segment);
    return { added: true, usedChars: maxChars };
  }

  contextParts.push(block);
  selectedSegments.push(segment);
  return { added: true, usedChars: usedChars + blockLength };
}

export function buildLecturePackContext({
  candidateSegments,
  maxChars = 6000,
  lectureLabels = {},
}: {
  candidateSegments: RetrievalSegment[];
  maxChars?: number;
  lectureLabels?: Record<string, string>;
}) {
  const orderedSegments = [...candidateSegments].sort((first, second) => {
    const lectureDiff = first.lectureId.localeCompare(second.lectureId);
    if (lectureDiff !== 0) return lectureDiff;

    const firstPosition = getSegmentPosition(first);
    const secondPosition = getSegmentPosition(second);
    const pageDiff = firstPosition.page - secondPosition.page;
    if (pageDiff !== 0) return pageDiff;

    const slideDiff = firstPosition.slide - secondPosition.slide;
    if (slideDiff !== 0) return slideDiff;

    return firstPosition.charStart - secondPosition.charStart;
  });
  const selectedSegments: RetrievalSegment[] = [];
  const contextParts: string[] = [];
  let usedChars = 0;
  const lectureIds = Array.from(new Set(orderedSegments.map((segment) => segment.lectureId)));

  if (lectureIds.length > 1) {
    const groupedSegments = new Map<string, RetrievalSegment[]>();
    for (const segment of orderedSegments) {
      groupedSegments.set(segment.lectureId, [
        ...(groupedSegments.get(segment.lectureId) || []),
        segment,
      ]);
    }
    const perLectureBudget = Math.floor(maxChars / lectureIds.length);

    for (const lectureId of lectureIds) {
      let lectureUsedChars = 0;
      const segments = groupedSegments.get(lectureId) || [];

      for (const segment of segments) {
        const blockLength = buildSegmentBlock(segment, lectureLabels).length
          + (contextParts.length > 0 ? 2 : 0);
        const exceedsLectureBudget = lectureUsedChars > 0
          && lectureUsedChars + blockLength > perLectureBudget;
        if (exceedsLectureBudget) break;

        const result = appendSegmentBlock({
          segment,
          contextParts,
          selectedSegments,
          usedChars,
          maxChars,
          lectureLabels,
        });
        if (!result.added) break;

        usedChars = result.usedChars;
        lectureUsedChars += blockLength;
      }
    }

    return {
      contextText: contextParts.join('\n\n'),
      segments: selectedSegments,
    };
  }

  for (const segment of orderedSegments) {
    const result = appendSegmentBlock({
      segment,
      contextParts,
      selectedSegments,
      usedChars,
      maxChars,
      lectureLabels,
    });
    if (!result.added) break;
    usedChars = result.usedChars;
  }

  return {
    contextText: contextParts.join('\n\n'),
    segments: selectedSegments,
  };
}
