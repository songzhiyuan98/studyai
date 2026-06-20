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

function readCount(rows: CountRow[]) {
  const value = rows[0]?.count || 0;
  return typeof value === 'bigint' ? Number(value) : Number(value);
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
