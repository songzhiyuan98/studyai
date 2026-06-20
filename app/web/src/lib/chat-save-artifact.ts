import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { mapStoredItemToArtifact, type StudyArtifact, type StudyItemType, type StudySourceRef } from './study-actions';

export const chatSourceRefSchema = z.object({
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

export const saveChatOutputSchema = z.object({
  mode: z.enum(['free', 'explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(12000),
  sourceRefs: z.array(chatSourceRefSchema).min(1).max(20),
});

export type SaveChatOutputInput = z.infer<typeof saveChatOutputSchema>;

const itemTypeByMode: Record<SaveChatOutputInput['mode'], StudyItemType> = {
  free: 'SUMMARY',
  explain: 'SUMMARY',
  summarize: 'SUMMARY',
  key_terms: 'GLOSSARY',
  mini_quiz: 'QUIZ',
  cheat_sheet: 'FLASHCARDS',
};

const storedActionByMode: Record<SaveChatOutputInput['mode'], string> = {
  free: 'summarize',
  explain: 'explain',
  summarize: 'summarize',
  key_terms: 'key_terms',
  mini_quiz: 'mini_quiz',
  cheat_sheet: 'cheat_sheet',
};

export function parseChatSourceRefs(sourceRefs: unknown): StudySourceRef[] {
  const parsed = z.array(chatSourceRefSchema).safeParse(sourceRefs);
  if (!parsed.success) {
    return [];
  }

  return parsed.data.map((ref) => ({
    lectureId: ref.lectureId,
    segmentId: ref.segmentId,
    page: ref.page ?? null,
    slide: ref.slide ?? null,
    charStart: ref.charStart ?? null,
    charEnd: ref.charEnd ?? null,
    label: ref.label,
    score: ref.score,
    reason: ref.reason,
  }));
}

export async function saveChatOutputAsArtifact({
  userId,
  output,
  generationMode = 'chat_retrieval_v0',
}: {
  userId: string;
  output: SaveChatOutputInput;
  generationMode?: string;
}): Promise<StudyArtifact | null> {
  const requestedSegmentIds = Array.from(new Set(output.sourceRefs.map((ref) => ref.segmentId)));
  const verifiedSegments = await prisma.segment.findMany({
    where: {
      id: {
        in: requestedSegmentIds,
      },
      lecture: {
        userId,
      },
    },
    select: {
      id: true,
      lectureId: true,
    },
  });
  const verifiedIds = new Set(verifiedSegments.map((segment) => segment.id));
  const verifiedRefs = output.sourceRefs.filter((ref) => verifiedIds.has(ref.segmentId));

  if (verifiedRefs.length === 0 || verifiedSegments.length === 0) {
    return null;
  }

  const selectionLectureId = verifiedSegments[0].lectureId;
  const selection = await prisma.selection.create({
    data: {
      userId,
      lectureId: selectionLectureId,
      segmentIds: verifiedRefs.map((ref) => ref.segmentId),
    },
  });

  const item = await prisma.item.create({
    data: {
      selectionId: selection.id,
      type: itemTypeByMode[output.mode],
      payloadJson: {
        action: storedActionByMode[output.mode],
        title: output.title,
        content: output.content,
        generationMode,
      },
      sourceRefs: verifiedRefs,
      relatedRefs: [],
      model: 'retrieval-v0',
      tokenUsed: 0,
    },
  });

  return mapStoredItemToArtifact(item);
}
