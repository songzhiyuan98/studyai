import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import {
  StudyActionId,
  buildPlaceholderArtifact,
  formatStudyActionTitle,
  getStudyAction,
  mapStoredItemToArtifact,
} from '@/lib/study-actions';
import { formatSourceRef } from '@/lib/reader-format';

const actionSchema = z.object({
  lectureId: z.string().min(1),
  segmentIds: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(['explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']),
  instructions: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const items = await prisma.item.findMany({
      where: {
        selection: {
          userId: session.user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number.isNaN(limit) ? 50 : limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        artifacts: items.map(mapStoredItemToArtifact),
      },
    });
  } catch (error) {
    console.error('Failed to fetch study artifacts:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch study artifacts' },
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

    const parsed = actionSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid study action request' },
        { status: 400 },
      );
    }

    const uniqueSegmentIds = Array.from(new Set(parsed.data.segmentIds));
    const lecture = await prisma.lecture.findFirst({
      where: {
        id: parsed.data.lectureId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!lecture) {
      return NextResponse.json(
        { success: false, error: 'Lecture not found' },
        { status: 404 },
      );
    }

    const segments = await prisma.segment.findMany({
      where: {
        id: {
          in: uniqueSegmentIds,
        },
        lectureId: lecture.id,
      },
      orderBy: [
        { page: 'asc' },
        { slide: 'asc' },
        { charStart: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (segments.length !== uniqueSegmentIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more source segments were not found' },
        { status: 400 },
      );
    }

    const sourceRefs = segments.map((segment) => ({
      lectureId: lecture.id,
      segmentId: segment.id,
      page: segment.page,
      slide: segment.slide,
      charStart: segment.charStart,
      charEnd: segment.charEnd,
      label: formatSourceRef(segment),
    }));
    const action = parsed.data.action as StudyActionId;
    const placeholder = buildPlaceholderArtifact({
      action,
      segmentTexts: segments.map((segment) => segment.text),
      sourceRefs,
    });

    const selection = await prisma.selection.create({
      data: {
        userId: session.user.id,
        lectureId: lecture.id,
        segmentIds: segments.map((segment) => segment.id),
      },
    });

    const item = await prisma.item.create({
      data: {
        selectionId: selection.id,
        type: getStudyAction(action).itemType,
        payloadJson: {
          action,
          title: formatStudyActionTitle(action, segments.length),
          content: placeholder.content,
          instructions: parsed.data.instructions || null,
          generationMode: 'placeholder',
        },
        sourceRefs,
        model: 'placeholder',
        tokenUsed: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        artifact: {
          id: item.id,
          ...placeholder,
          createdAt: item.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Failed to run study action:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to run study action' },
      { status: 500 },
    );
  }
}
