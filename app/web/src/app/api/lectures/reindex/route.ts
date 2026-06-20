import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { authOptions } from '@/lib/auth';
import { isEmbeddingConfigured } from '@/lib/embeddings';
import { backfillSegmentEmbeddings, type SegmentEmbeddingInput } from '@/lib/segment-embeddings';

type MissingEmbeddingRow = {
  id: string;
  text: string;
};

type CountRow = {
  count: bigint | number;
};

type LectureEmbeddingStatsRow = {
  id: string;
  total_segment_count: bigint | number;
  embedded_segment_count: bigint | number;
};

function readCount(rows: CountRow[]) {
  const value = rows[0]?.count || 0;
  return typeof value === 'bigint' ? Number(value) : Number(value);
}

function readNumber(value: bigint | number) {
  return typeof value === 'bigint' ? Number(value) : Number(value);
}

async function syncLectureEmbeddingMeta(userId: string) {
  const stats = await prisma.$queryRaw<LectureEmbeddingStatsRow[]>`
    SELECT
      l.id,
      COUNT(s.id)::bigint as total_segment_count,
      COUNT(s.embedding)::bigint as embedded_segment_count
    FROM lectures l
    LEFT JOIN segments s ON s.lecture_id = l.id
    WHERE l.user_id = ${userId}
      AND l.status = 'PROCESSED'
    GROUP BY l.id
  `;
  const lectures = await prisma.lecture.findMany({
    where: {
      userId,
      status: 'PROCESSED',
      id: {
        in: stats.map((row) => row.id),
      },
    },
    select: {
      id: true,
      meta: true,
    },
  });
  const lectureMetaById = new Map(lectures.map((lecture) => [lecture.id, lecture.meta]));

  await Promise.all(stats.map((row) => {
    const totalSegmentCount = readNumber(row.total_segment_count);
    const embeddedSegmentCount = readNumber(row.embedded_segment_count);
    const existingMeta = lectureMetaById.get(row.id);
    const embeddingStatus = totalSegmentCount > 0 && embeddedSegmentCount >= totalSegmentCount
      ? 'completed'
      : embeddedSegmentCount > 0
        ? 'partial'
        : 'failed';

    return prisma.lecture.update({
      where: { id: row.id },
      data: {
        meta: {
          ...(existingMeta && typeof existingMeta === 'object' && !Array.isArray(existingMeta) ? existingMeta : {}),
          embeddingStatus,
          embeddingModel: process.env.OPENAI_MODEL_EMBEDDING || 'text-embedding-3-small',
          embeddedSegmentCount,
        },
      },
    });
  }));

  return stats.length;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    if (!isEmbeddingConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OpenAI embeddings are not configured.' },
        { status: 400 },
      );
    }

    const missingCountRows = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint as count
      FROM segments s
      JOIN lectures l ON l.id = s.lecture_id
      WHERE l.user_id = ${session.user.id}
        AND l.status = 'PROCESSED'
        AND s.embedding IS NULL
    `;
    const totalMissingSegmentCount = readCount(missingCountRows);
    const missingSegments = await prisma.$queryRaw<MissingEmbeddingRow[]>`
      SELECT s.id, s.text
      FROM segments s
      JOIN lectures l ON l.id = s.lecture_id
      WHERE l.user_id = ${session.user.id}
        AND l.status = 'PROCESSED'
        AND s.embedding IS NULL
      ORDER BY l.updated_at DESC, s.created_at ASC
      LIMIT 500
    `;

    const result = await backfillSegmentEmbeddings(
      missingSegments.map((segment): SegmentEmbeddingInput => ({
        id: segment.id,
        text: segment.text,
      })),
    );
    const syncedLectureCount = await syncLectureEmbeddingMeta(session.user.id);
    const remainingCountRows = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint as count
      FROM segments s
      JOIN lectures l ON l.id = s.lecture_id
      WHERE l.user_id = ${session.user.id}
        AND l.status = 'PROCESSED'
        AND s.embedding IS NULL
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        totalMissingSegmentCount,
        remainingSegmentCount: readCount(remainingCountRows),
        syncedLectureCount,
      },
    });
  } catch (error) {
    console.error('Failed to reindex lecture embeddings:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to reindex lecture embeddings' },
      { status: 500 },
    );
  }
}
