import { prisma } from '@study-assistant/db';
import { createEmbeddings } from './embeddings';
import { chunkEmbeddingInputs } from './segment-embedding-batches';

export type SegmentEmbeddingInput = {
  id: string;
  text: string;
};

export type SegmentEmbeddingBackfillResult = {
  requestedSegmentCount: number;
  embeddedSegmentCount: number;
};

export async function writeSegmentEmbeddings(embeddings: Array<{ id: string; embedding: number[] }>) {
  if (embeddings.length === 0) return;

  await prisma.$transaction(
    embeddings.map(({ id, embedding }) =>
      prisma.$executeRaw`
        UPDATE segments
        SET embedding = ${JSON.stringify(embedding)}::vector
        WHERE id = ${id}
      `,
    ),
  );
}

export async function backfillSegmentEmbeddings(
  segments: SegmentEmbeddingInput[],
  batchSize = 32,
): Promise<SegmentEmbeddingBackfillResult> {
  let embeddedSegmentCount = 0;

  for (const batch of chunkEmbeddingInputs(segments, batchSize)) {
    const embeddings = await createEmbeddings(batch);
    await writeSegmentEmbeddings(embeddings);
    embeddedSegmentCount += embeddings.length;
  }

  return {
    requestedSegmentCount: segments.length,
    embeddedSegmentCount,
  };
}
