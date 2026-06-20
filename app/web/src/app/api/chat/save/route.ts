import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { mapStoredItemToArtifact, type StudyItemType } from '@/lib/study-actions';

const chatSourceRefSchema = z.object({
  lectureId: z.string().min(1),
  segmentId: z.string().min(1),
  page: z.number().nullable().optional(),
  slide: z.number().nullable().optional(),
  charStart: z.number().nullable().optional(),
  charEnd: z.number().nullable().optional(),
  label: z.string().min(1),
  score: z.number().optional(),
  reason: z.enum(['lexical', 'nearby', 'vector', 'hybrid']).optional(),
});

const saveChatSchema = z.object({
  mode: z.enum(['free', 'explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(12000),
  sourceRefs: z.array(chatSourceRefSchema).min(1).max(20),
});

const itemTypeByMode: Record<z.infer<typeof saveChatSchema>['mode'], StudyItemType> = {
  free: 'SUMMARY',
  explain: 'SUMMARY',
  summarize: 'SUMMARY',
  key_terms: 'GLOSSARY',
  mini_quiz: 'QUIZ',
  cheat_sheet: 'FLASHCARDS',
};

const storedActionByMode: Record<z.infer<typeof saveChatSchema>['mode'], string> = {
  free: 'summarize',
  explain: 'explain',
  summarize: 'summarize',
  key_terms: 'key_terms',
  mini_quiz: 'mini_quiz',
  cheat_sheet: 'cheat_sheet',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const parsed = saveChatSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid saved chat output request' },
        { status: 400 },
      );
    }

    const requestedSegmentIds = Array.from(new Set(parsed.data.sourceRefs.map((ref) => ref.segmentId)));
    const verifiedSegments = await prisma.segment.findMany({
      where: {
        id: {
          in: requestedSegmentIds,
        },
        lecture: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        lectureId: true,
      },
    });
    const verifiedIds = new Set(verifiedSegments.map((segment) => segment.id));
    const verifiedRefs = parsed.data.sourceRefs.filter((ref) => verifiedIds.has(ref.segmentId));

    if (verifiedRefs.length === 0 || verifiedSegments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid source references were found for this saved output' },
        { status: 400 },
      );
    }

    const selectionLectureId = verifiedSegments[0].lectureId;
    const selection = await prisma.selection.create({
      data: {
        userId: session.user.id,
        lectureId: selectionLectureId,
        segmentIds: verifiedRefs.map((ref) => ref.segmentId),
      },
    });

    const item = await prisma.item.create({
      data: {
        selectionId: selection.id,
        type: itemTypeByMode[parsed.data.mode],
        payloadJson: {
          action: storedActionByMode[parsed.data.mode],
          title: parsed.data.title,
          content: parsed.data.content,
          generationMode: 'chat_retrieval_v0',
        },
        sourceRefs: verifiedRefs,
        relatedRefs: [],
        model: 'retrieval-v0',
        tokenUsed: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        artifact: mapStoredItemToArtifact(item),
      },
    });
  } catch (error) {
    console.error('Failed to save chat output:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to save chat output' },
      { status: 500 },
    );
  }
}
