import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { formatSourceRef } from '@/lib/reader-format';
import { retrieveContextForQuery, compactContextText } from '@/lib/rag-context';
import { buildChatAnswer, chatModeLabels } from '@/lib/chat-answer';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['free', 'explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']).default('free'),
  lectureIds: z.array(z.string().min(1)).max(20).optional(),
});

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
          title: chatModeLabels[parsed.data.mode],
          content: buildChatAnswer({
            mode: parsed.data.mode,
            message: parsed.data.message,
            contextText,
          }),
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
