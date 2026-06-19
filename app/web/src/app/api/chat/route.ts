import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { formatSourceRef } from '@/lib/reader-format';
import { retrieveContextForQuery, compactContextText } from '@/lib/rag-context';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['free', 'explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']).default('free'),
  lectureIds: z.array(z.string().min(1)).max(20).optional(),
});

type ChatMode = z.infer<typeof chatSchema>['mode'];

const modeLabels: Record<ChatMode, string> = {
  free: 'Study answer',
  explain: 'Explanation',
  summarize: 'Summary',
  key_terms: 'Key terms',
  mini_quiz: 'Mini quiz',
  cheat_sheet: 'Cheat sheet draft',
};

const modeInstructions: Record<ChatMode, string> = {
  free: 'Here is a grounded study response based on your library context.',
  explain: 'Here is a clear explanation of the selected concept.',
  summarize: 'Here is a compact summary of the retrieved lecture context.',
  key_terms: 'Here are the key terms that appear most relevant.',
  mini_quiz: 'Here is a short practice quiz grounded in the retrieved context.',
  cheat_sheet: 'Here is a printable cheat-sheet outline grounded in the retrieved context.',
};

function buildAnswer(mode: ChatMode, message: string, contextText: string) {
  const compactMessage = message.trim();
  const contextPreview = contextText || 'No matching context was found.';

  if (mode === 'mini_quiz') {
    return `${modeInstructions[mode]}\n\n1. What is the main idea behind: ${compactMessage}?\n2. Which source example best supports this idea?\n3. Explain the answer in your own words using one cited source.\n\nSource notes considered: ${contextPreview}`;
  }

  if (mode === 'key_terms') {
    const terms = Array.from(new Set(contextPreview.match(/[A-Za-z][A-Za-z0-9_-]{3,}/g) || []))
      .slice(0, 8)
      .join(', ');

    return `${modeInstructions[mode]}\n\n${terms || 'No strong terms found yet.'}\n\nUse these as anchors while reviewing: ${contextPreview}`;
  }

  if (mode === 'cheat_sheet') {
    return `${modeInstructions[mode]}\n\n- Topic: ${compactMessage}\n- Must know: ${contextPreview}\n- Practice: turn each cited point into one quick recall question.\n- Source check: keep the citation labels next to each bullet before printing.`;
  }

  return `${modeInstructions[mode]}\n\nQuestion: ${compactMessage}\n\nGrounded context: ${contextPreview}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const lectures = await prisma.lecture.findMany({
      where: {
        userId: session.user.id,
        status: 'PROCESSED',
        segments: {
          some: {},
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        folder: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            segments: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        sources: lectures.map((lecture) => ({
          id: lecture.id,
          label: lecture.title,
          detail: `${lecture.folder?.name || 'Library'} · ${lecture.type} · ${lecture._count.segments} chunks`,
          segments: lecture._count.segments,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to load chat sources:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to load chat sources' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const parsed = chatSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid chat request' },
        { status: 400 },
      );
    }

    const scopedLectureIds = parsed.data.lectureIds?.length
      ? Array.from(new Set(parsed.data.lectureIds))
      : undefined;

    const lectures = await prisma.lecture.findMany({
      where: {
        userId: session.user.id,
        status: 'PROCESSED',
        ...(scopedLectureIds ? { id: { in: scopedLectureIds } } : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        folder: {
          select: {
            name: true,
          },
        },
        segments: {
          orderBy: [
            { page: 'asc' },
            { slide: 'asc' },
            { charStart: 'asc' },
            { createdAt: 'asc' },
          ],
          take: 80,
        },
      },
      take: 20,
    });

    const candidateSegments = lectures.flatMap((lecture) => (
      lecture.segments.map((segment) => ({
        id: segment.id,
        lectureId: lecture.id,
        text: segment.text,
        page: segment.page,
        slide: segment.slide,
        charStart: segment.charStart,
        charEnd: segment.charEnd,
      }))
    ));

    if (candidateSegments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: {
            role: 'assistant',
            content: 'I could not find processed source chunks in your Library yet. Upload a PDF or TXT file in Library first, then come back and ask me to study it with you.',
            title: 'No ready sources',
            sourceRefs: [],
            retrieval: {
              strategy: 'lexical_page_aware_v0',
              count: 0,
            },
          },
        },
      });
    }

    const retrieved = retrieveContextForQuery({
      query: parsed.data.message,
      candidateSegments,
      limit: 6,
    });
    const fallbackSegments = candidateSegments.slice(0, 3).map((segment) => ({
      segment,
      score: 0,
      reason: 'lexical' as const,
    }));
    const context = retrieved.length > 0 ? retrieved : fallbackSegments;
    const contextText = compactContextText(context.map(({ segment }) => segment), 1000);
    const lectureMap = new Map(lectures.map((lecture) => [lecture.id, lecture]));
    const sourceRefs = context.map(({ segment, score, reason }) => {
      const lecture = lectureMap.get(segment.lectureId);

      return {
        lectureId: segment.lectureId,
        segmentId: segment.id,
        page: segment.page,
        slide: segment.slide,
        charStart: segment.charStart,
        charEnd: segment.charEnd,
        label: `${lecture?.title || 'Source'} · ${formatSourceRef(segment)}`,
        score,
        reason,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        message: {
          role: 'assistant',
          title: modeLabels[parsed.data.mode],
          content: buildAnswer(parsed.data.mode, parsed.data.message, contextText),
          sourceRefs,
          retrieval: {
            strategy: 'lexical_page_aware_v0',
            count: context.length,
            scopedLectureCount: lectures.length,
          },
        },
      },
    });
  } catch (error) {
    console.error('Failed to run chat retrieval:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to run chat retrieval' },
      { status: 500 },
    );
  }
}
