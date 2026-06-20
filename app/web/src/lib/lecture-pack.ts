import type { RetrievalSegment } from './rag-context';

function getSegmentPosition(segment: RetrievalSegment) {
  return {
    page: segment.page ?? Number.MAX_SAFE_INTEGER,
    slide: segment.slide ?? Number.MAX_SAFE_INTEGER,
    charStart: segment.charStart ?? Number.MAX_SAFE_INTEGER,
  };
}

function formatPackLabel(segment: RetrievalSegment) {
  if (segment.page) {
    return `${segment.lectureId} · page ${segment.page}`;
  }

  if (segment.slide) {
    return `${segment.lectureId} · slide ${segment.slide}`;
  }

  return `${segment.lectureId} · source`;
}

export function buildLecturePackContext({
  candidateSegments,
  maxChars = 6000,
}: {
  candidateSegments: RetrievalSegment[];
  maxChars?: number;
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

  for (const segment of orderedSegments) {
    const block = `[${formatPackLabel(segment)}]\n${segment.text.trim()}`;
    const blockLength = block.length + (contextParts.length > 0 ? 2 : 0);

    if (contextParts.length > 0 && usedChars + blockLength > maxChars) {
      break;
    }

    if (contextParts.length === 0 && block.length > maxChars) {
      const truncatedBlock = block.slice(0, Math.max(0, maxChars - 1)).trimEnd();
      contextParts.push(`${truncatedBlock}…`);
      selectedSegments.push(segment);
      break;
    }

    contextParts.push(block);
    selectedSegments.push(segment);
    usedChars += blockLength;
  }

  return {
    contextText: contextParts.join('\n\n'),
    segments: selectedSegments,
  };
}
