import { createHash } from 'crypto';

export type ParsedSegment = {
  content: string;
  page: number | null;
  charStart: number;
  charEnd: number;
};

export type ParsedDocument = {
  content: string;
  metadata: Record<string, unknown>;
  segments: ParsedSegment[];
};

type PdfPageData = {
  getTextContent: (options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }) => Promise<{
    items: Array<{
      str?: string;
      transform?: number[];
    }>;
  }>;
};

const DEFAULT_CHUNK_CHAR_LIMIT = 1200;
const DEFAULT_CHUNK_OVERLAP = 160;

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.3));
}

function renderTextItems(items: Array<{ str?: string; transform?: number[] }>): string {
  let lastY: number | null = null;
  let text = '';

  for (const item of items) {
    const currentY = item.transform?.[5] ?? null;
    const value = item.str || '';

    if (!value) {
      continue;
    }

    if (lastY === null || currentY === lastY) {
      text += value;
    } else {
      text += `\n${value}`;
    }

    lastY = currentY;
  }

  return text;
}

function findChunkEnd(text: string, start: number, hardEnd: number): number {
  const window = text.slice(start, hardEnd);
  const paragraphBreak = window.lastIndexOf('\n\n');
  if (paragraphBreak > DEFAULT_CHUNK_CHAR_LIMIT * 0.45) {
    return start + paragraphBreak;
  }

  const sentenceBreak = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('? '),
    window.lastIndexOf('! '),
    window.lastIndexOf('。'),
    window.lastIndexOf('？'),
    window.lastIndexOf('！'),
  );
  if (sentenceBreak > DEFAULT_CHUNK_CHAR_LIMIT * 0.55) {
    return start + sentenceBreak + 1;
  }

  const wordBreak = window.lastIndexOf(' ');
  if (wordBreak > DEFAULT_CHUNK_CHAR_LIMIT * 0.65) {
    return start + wordBreak;
  }

  return hardEnd;
}

export function segmentText(
  text: string,
  options: {
    page?: number | null;
    chunkCharLimit?: number;
    chunkOverlap?: number;
    charOffset?: number;
  } = {},
): ParsedSegment[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const chunkCharLimit = options.chunkCharLimit || DEFAULT_CHUNK_CHAR_LIMIT;
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;
  const charOffset = options.charOffset || 0;
  const segments: ParsedSegment[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + chunkCharLimit, normalized.length);
    const end = hardEnd === normalized.length ? hardEnd : findChunkEnd(normalized, start, hardEnd);
    const content = normalized.slice(start, end).trim();

    if (content) {
      segments.push({
        content,
        page: options.page ?? null,
        charStart: charOffset + start,
        charEnd: charOffset + end,
      });
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - chunkOverlap, start + 1);
  }

  return segments;
}

function parseTextBuffer(buffer: Buffer): ParsedDocument {
  const content = normalizeText(buffer.toString('utf8'));
  const segments = segmentText(content);

  return {
    content,
    metadata: {
      parser: 'text',
      wordCount: content.split(/\s+/).filter(Boolean).length,
      tokenEstimate: estimateTokenCount(content),
    },
    segments,
  };
}

async function parsePdfBuffer(buffer: Buffer): Promise<ParsedDocument> {
  const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
  const pageTexts: string[] = [];
  const pdfParse = pdfParseModule.default as (dataBuffer: Buffer, options?: {
    pagerender?: (pageData: PdfPageData) => Promise<string>;
  }) => Promise<{
    text?: string;
    numpages?: number;
    info?: unknown;
  }>;
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData: PdfPageData) => {
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });
      const pageText = normalizeText(renderTextItems(textContent.items));
      pageTexts.push(pageText);
      return pageText;
    },
  });
  const content = normalizeText(pageTexts.join('\n\n'));
  const segments: ParsedSegment[] = [];
  let charOffset = 0;

  pageTexts.forEach((pageText, index) => {
    const normalizedPage = normalizeText(pageText);
    if (!normalizedPage) {
      return;
    }

    segments.push(...segmentText(normalizedPage, {
      page: index + 1,
      charOffset,
    }));
    charOffset += normalizedPage.length + 2;
  });

  return {
    content,
    metadata: {
      parser: 'pdf-parse',
      pageCount: parsed.numpages || null,
      info: parsed.info || null,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      tokenEstimate: estimateTokenCount(content),
    },
    segments,
  };
}

export async function parseDocumentBuffer({
  buffer,
  lectureType,
}: {
  buffer: Buffer;
  lectureType: string;
}): Promise<ParsedDocument> {
  if (lectureType === 'TXT') {
    return parseTextBuffer(buffer);
  }

  if (lectureType === 'PDF') {
    return parsePdfBuffer(buffer);
  }

  throw new Error(`${lectureType} parsing is not implemented yet.`);
}

export function createStableSegmentHash(lectureId: string, content: string, index: number): string {
  return createHash('sha256')
    .update(`${lectureId}:${index}:${content}`)
    .digest('hex');
}
