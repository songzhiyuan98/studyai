import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma, prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { formatSourceRef } from '@/lib/reader-format';
import {
  mergeHybridContext,
  retrieveBroadCoverageContext,
  retrieveContextForPageRequest,
  retrieveContextForQuery,
  type RetrievedContext,
} from '@/lib/rag-context';
import { createEmbeddings, isEmbeddingConfigured } from '@/lib/embeddings';
import { resolveExplicitLectureScope } from '@/lib/source-scope';
import { planChatTurn } from '@/lib/chat-planner';
import { resolveLibraryScope } from '@/lib/library-catalog';
import { buildLecturePackContext } from '@/lib/lecture-pack';

const previewSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['free', 'explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']).default('free'),
  lectureIds: z.array(z.string().min(1)).max(20).optional(),
});

type VectorSearchRow = {
  id: string;
  lecture_id: string;
  text: string;
  page: number | null;
  slide: number | null;
  char_start: number | null;
  char_end: number | null;
  score: number;
};

async function retrieveVectorPreview({
  query,
  userId,
  lectureIds,
  limit = 8,
}: {
  query: string;
  userId: string;
  lectureIds?: string[];
  limit?: number;
}): Promise<RetrievedContext[]> {
  if (!isEmbeddingConfigured()) {
    return [];
  }

  const [queryEmbedding] = await createEmbeddings([{ id: 'query', text: query }]);
  if (!queryEmbedding) {
    return [];
  }

  const embeddingJson = JSON.stringify(queryEmbedding.embedding);
  const lectureFilter = lectureIds?.length
    ? Prisma.sql`AND s.lecture_id IN (${Prisma.join(lectureIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<VectorSearchRow[]>`
    SELECT
      s.id,
      s.lecture_id,
      s.text,
      s.page,
      s.slide,
      s.char_start,
      s.char_end,
      1 - (s.embedding <=> ${embeddingJson}::vector) as score
    FROM segments s
    JOIN lectures l ON l.id = s.lecture_id
    WHERE l.user_id = ${userId}
      AND l.status = 'PROCESSED'
      AND s.embedding IS NOT NULL
      ${lectureFilter}
    ORDER BY s.embedding <=> ${embeddingJson}::vector
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    segment: {
      id: row.id,
      lectureId: row.lecture_id,
      text: row.text,
      page: row.page,
      slide: row.slide,
      charStart: row.char_start,
      charEnd: row.char_end,
    },
    score: Number(row.score),
    reason: 'vector',
  }));
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

    const parsed = previewSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid source preview request' },
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
        originalName: true,
        courseId: true,
        type: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            segments: true,
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

    const libraryScope = resolveLibraryScope({
      lectures,
      query: parsed.data.message,
      explicitLectureIds: scopedLectureIds,
    });
    const titleScope = libraryScope.narrowed
      ? null
      : resolveExplicitLectureScope({
        lectures,
        query: parsed.data.message,
      });
    const explicitScope = titleScope || libraryScope;
    const activeLectures = explicitScope.lectures;
    const retrievalLectureIds = explicitScope.lectureIds.length > 0
      ? explicitScope.lectureIds
      : scopedLectureIds;
    const candidateSegments = activeLectures.flatMap((lecture) => (
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
    const activeSegmentCount = activeLectures.reduce((count, lecture) => (
      count + (lecture._count?.segments || lecture.segments.length)
    ), 0);

    if (candidateSegments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sourceRefs: [],
          materials: [],
          retrieval: {
            strategy: 'lexical_page_aware_v0',
            count: 0,
            scopedLectureCount: activeLectures.length,
          },
        },
      });
    }

    let retrievalStrategy = 'lexical_page_aware_v0';
    let vectorResults: RetrievedContext[] = [];
    const previewPlan = planChatTurn({
      mode: parsed.data.mode,
      message: parsed.data.message,
      hasExplicitScope: Boolean(scopedLectureIds?.length),
    });
    const effectiveContextStrategy = previewPlan.contextStrategy === 'lecture_pack' && activeSegmentCount > 80
      ? 'long_document_map'
      : previewPlan.contextStrategy;
    const usesLecturePack = effectiveContextStrategy === 'lecture_pack';
    const usesBroadCoverage = previewPlan.retrievalBreadth === 'broad_assessment'
      || previewPlan.retrievalBreadth === 'broad_lesson'
      || effectiveContextStrategy === 'long_document_map';
    const broadCoverageResults = usesBroadCoverage && !usesLecturePack
      ? retrieveBroadCoverageContext({
        query: parsed.data.message,
        candidateSegments,
        perLecture: previewPlan.retrievalBreadth === 'broad_lesson' ? 6 : 4,
        limit: previewPlan.retrievalBreadth === 'broad_lesson' ? 20 : 16,
      })
      : [];
    const pageResults = usesLecturePack
      ? []
      : retrieveContextForPageRequest({
        query: parsed.data.message,
        candidateSegments,
        limit: 8,
      });
    const lexicalResults = usesLecturePack
      ? []
      : retrieveContextForQuery({
        query: parsed.data.message,
        candidateSegments,
        limit: 8,
      });

    if (!usesLecturePack && pageResults.length === 0 && broadCoverageResults.length === 0) {
      try {
        vectorResults = await retrieveVectorPreview({
          query: parsed.data.message,
          userId: session.user.id,
          lectureIds: retrievalLectureIds,
          limit: 8,
        });
      } catch (vectorError) {
        console.error('Vector source preview failed, falling back to lexical:', vectorError);
      }
    }

    let retrieved: RetrievedContext[];
    if (usesLecturePack) {
      const lecturePack = buildLecturePackContext({
        candidateSegments,
        maxChars: 6000,
      });
      retrieved = lecturePack.segments.map((segment, index) => ({
        segment,
        score: 1 - index * 0.001,
        reason: 'nearby' as const,
      }));
      retrievalStrategy = 'lecture_pack_v0';
    } else if (broadCoverageResults.length > 0) {
      retrieved = broadCoverageResults;
      retrievalStrategy = effectiveContextStrategy === 'long_document_map'
        ? 'long_document_map_v0'
        : previewPlan.retrievalBreadth === 'broad_lesson'
        ? 'broad_lesson_v0'
        : 'broad_assessment_v0';
    } else if (pageResults.length > 0) {
      retrieved = pageResults.slice(0, 6);
      retrievalStrategy = 'exact_page_v0';
    } else if (vectorResults.length > 0 && lexicalResults.length > 0) {
      retrieved = mergeHybridContext({ vectorResults, lexicalResults, limit: 6 });
      retrievalStrategy = 'hybrid_vector_lexical_v0';
    } else if (vectorResults.length > 0) {
      retrieved = vectorResults.slice(0, 6);
      retrievalStrategy = 'pgvector_embedding_v0';
    } else {
      retrieved = lexicalResults.slice(0, 6);
    }

    const context = retrieved.length > 0
      ? retrieved
      : candidateSegments.slice(0, 3).map((segment) => ({
        segment,
        score: 0,
        reason: 'lexical' as const,
      }));
    const lectureMap = new Map(activeLectures.map((lecture) => [lecture.id, lecture]));
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
    const materialMap = new Map<string, {
      lectureId: string;
      title: string;
      detail: string;
      count: number;
    }>();

    sourceRefs.forEach((source) => {
      const lecture = lectureMap.get(source.lectureId);
      const existing = materialMap.get(source.lectureId);

      if (existing) {
        existing.count += 1;
        return;
      }

      materialMap.set(source.lectureId, {
        lectureId: source.lectureId,
        title: lecture?.title || 'Source',
        detail: `${lecture?.folder?.name || 'Library'} · ${lecture?.type || 'Source'}`,
        count: 1,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceRefs,
        materials: Array.from(materialMap.values()),
        retrieval: {
          strategy: retrievalStrategy,
          contextStrategy: effectiveContextStrategy,
          count: context.length,
          scopedLectureCount: activeLectures.length,
          sourceScope: libraryScope.source === 'all_ready' && titleScope?.narrowed
            ? 'lecture_title'
            : libraryScope.source,
          libraryScope,
          plan: previewPlan,
        },
      },
    });
  } catch (error) {
    console.error('Failed to preview chat sources:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to preview chat sources' },
      { status: 500 },
    );
  }
}
