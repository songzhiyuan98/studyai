import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma, prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { formatSourceRef } from '@/lib/reader-format';
import {
  compactContextText,
  mergeHybridContext,
  retrieveContextForQuery,
  type RetrievedContext,
} from '@/lib/rag-context';
import { buildChatAnswer, chatModeLabels } from '@/lib/chat-answer';
import {
  buildHistoryAwareRetrievalQuery,
  chunkTextForLocalStream,
  generateGroundedChatAnswer,
  getChatModelConfig,
  streamGroundedChatAnswer,
  type ChatHistoryTurn,
} from '@/lib/chat-llm';
import { createEmbeddings, isEmbeddingConfigured } from '@/lib/embeddings';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['free', 'explain', 'summarize', 'key_terms', 'mini_quiz', 'cheat_sheet']).default('free'),
  lectureIds: z.array(z.string().min(1)).max(20).optional(),
  sessionId: z.string().min(1).optional(),
  stream: z.boolean().optional(),
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

const streamEncoder = new TextEncoder();
const CHAT_STREAM_DELAY_MS = 28;

function encodeSseEvent(event: string, data: unknown) {
  return streamEncoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function waitForChatStreamPace() {
  return new Promise((resolve) => {
    setTimeout(resolve, CHAT_STREAM_DELAY_MS);
  });
}

function buildSessionTitle(message: string) {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed || 'New study chat';
}

async function getOrCreateChatSession({
  userId,
  sessionId,
  message,
  lectureIds,
}: {
  userId: string;
  sessionId?: string;
  message: string;
  lectureIds?: string[];
}) {
  if (sessionId) {
    const existingSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (existingSession) {
      return existingSession;
    }
  }

  return prisma.chatSession.create({
    data: {
      userId,
      title: buildSessionTitle(message),
      scopeJson: lectureIds?.length ? { lectureIds } : undefined,
    },
  });
}

async function touchChatSession(sessionId: string) {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
}

async function retrieveVectorContext({
  query,
  userId,
  lectureIds,
  limit = 6,
}: {
  query: string;
  userId: string;
  lectureIds?: string[];
  limit?: number;
}) {
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
    reason: 'vector' as const,
  }));
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
    const chatSession = await getOrCreateChatSession({
      userId: session.user.id,
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      lectureIds: scopedLectureIds,
    });
    const recentHistory: ChatHistoryTurn[] = (await prisma.chatMessage.findMany({
      where: {
        sessionId: chatSession.id,
        userId: session.user.id,
      },
      select: {
        role: true,
        title: true,
        content: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })).reverse().map((chatMessage) => ({
      role: chatMessage.role === 'USER' ? 'user' : 'assistant',
      title: chatMessage.title,
      content: chatMessage.content,
    }));

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        userId: session.user.id,
        role: 'USER',
        mode: parsed.data.mode,
        content: parsed.data.message,
      },
    });
    await touchChatSession(chatSession.id);

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
      const noSourcesContent = 'I could not find processed source chunks in your Library yet. Upload a PDF or TXT file in Library first, then come back and ask me to study it with you.';
      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          userId: session.user.id,
          role: 'ASSISTANT',
          mode: parsed.data.mode,
          title: 'No ready sources',
          content: noSourcesContent,
          sourceRefs: [],
          retrieval: {
            strategy: 'lexical_page_aware_v0',
            count: 0,
          },
        },
      });
      await touchChatSession(chatSession.id);

      return NextResponse.json({
        success: true,
        data: {
          message: {
            sessionId: chatSession.id,
            role: 'assistant',
            content: noSourcesContent,
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

    let retrievalStrategy = 'lexical_page_aware_v0';
    let vectorResults: RetrievedContext[] = [];
    const retrievalQuery = buildHistoryAwareRetrievalQuery({
      message: parsed.data.message,
      history: recentHistory,
    });
    const lexicalResults = retrieveContextForQuery({
      query: retrievalQuery,
      candidateSegments,
      limit: 8,
    });

    try {
      vectorResults = await retrieveVectorContext({
        query: retrievalQuery,
        userId: session.user.id,
        lectureIds: scopedLectureIds,
        limit: 8,
      });
    } catch (vectorError) {
      console.error('Vector retrieval failed, falling back to lexical:', vectorError);
    }

    const retrieved = vectorResults.length > 0 && lexicalResults.length > 0
      ? mergeHybridContext({
        vectorResults,
        lexicalResults,
        limit: 6,
      })
      : vectorResults.length > 0
        ? vectorResults.slice(0, 6)
        : lexicalResults.slice(0, 6);

    if (vectorResults.length > 0 && lexicalResults.length > 0) {
      retrievalStrategy = 'hybrid_vector_lexical_v0';
    } else if (vectorResults.length > 0) {
      retrievalStrategy = 'pgvector_embedding_v0';
    }

    const fallbackSegments: RetrievedContext[] = candidateSegments.slice(0, 3).map((segment) => ({
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
    const fallbackAnswerContent = buildChatAnswer({
      mode: parsed.data.mode,
      message: parsed.data.message,
      contextText,
    });
    const generationInput = {
      mode: parsed.data.mode,
      message: parsed.data.message,
      contextText,
      history: recentHistory,
      sources: context.map(({ segment }, index) => ({
        label: sourceRefs[index]?.label || formatSourceRef(segment),
        text: segment.text,
      })),
    };
    const retrievalTrace = {
      strategy: retrievalStrategy,
      count: context.length,
      scopedLectureCount: lectures.length,
      historyCount: recentHistory.length,
      query: recentHistory.length > 0 ? 'history_aware' : 'current_message',
    };

    if (parsed.data.stream) {
      const stream = new ReadableStream({
        async start(controller) {
          let fullContent = '';
          let generation = {
            provider: 'local_fallback',
            model: 'deterministic',
          };

          controller.enqueue(encodeSseEvent('metadata', {
            message: {
              sessionId: chatSession.id,
              role: 'assistant',
              title: chatModeLabels[parsed.data.mode],
              sourceRefs,
              retrieval: retrievalTrace,
            },
          }));

          try {
            let streamedFromModel = false;

            for await (const delta of streamGroundedChatAnswer(generationInput)) {
              streamedFromModel = true;
              fullContent += delta;
              await waitForChatStreamPace();
              controller.enqueue(encodeSseEvent('delta', { delta }));
            }

            if (streamedFromModel) {
              generation = {
                provider: 'openai_chat',
                model: getChatModelConfig().model,
              };
            }
          } catch (generationError) {
            console.error('Streaming LLM generation failed, falling back to local chat answer:', generationError);
            fullContent = '';
          }

          if (!fullContent) {
            for (const delta of chunkTextForLocalStream(fallbackAnswerContent)) {
              fullContent += delta;
              await waitForChatStreamPace();
              controller.enqueue(encodeSseEvent('delta', { delta }));
            }
          }

          await prisma.chatMessage.create({
            data: {
              sessionId: chatSession.id,
              userId: session.user.id,
              role: 'ASSISTANT',
              mode: parsed.data.mode,
              title: chatModeLabels[parsed.data.mode],
              content: fullContent,
              sourceRefs,
              retrieval: {
                ...retrievalTrace,
                generation,
              },
            },
          });
          await touchChatSession(chatSession.id);

          controller.enqueue(encodeSseEvent('done', {
            message: {
              sessionId: chatSession.id,
              role: 'assistant',
              title: chatModeLabels[parsed.data.mode],
              content: fullContent,
              sourceRefs,
              retrieval: {
                ...retrievalTrace,
                generation,
              },
            },
          }));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    let answerContent = buildChatAnswer({
      mode: parsed.data.mode,
      message: parsed.data.message,
      contextText,
    });
    let generation = {
      provider: 'local_fallback',
      model: 'deterministic',
    };

    try {
      const generatedAnswer = await generateGroundedChatAnswer({
        ...generationInput,
      });
      if (generatedAnswer) {
        answerContent = generatedAnswer.content;
        generation = {
          provider: generatedAnswer.provider,
          model: generatedAnswer.model,
        };
      }
    } catch (generationError) {
      console.error('LLM generation failed, falling back to local chat answer:', generationError);
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        userId: session.user.id,
        role: 'ASSISTANT',
        mode: parsed.data.mode,
        title: chatModeLabels[parsed.data.mode],
        content: answerContent,
        sourceRefs,
        retrieval: {
          ...retrievalTrace,
          generation,
        },
      },
    });
    await touchChatSession(chatSession.id);

    return NextResponse.json({
      success: true,
      data: {
        message: {
          sessionId: chatSession.id,
          role: 'assistant',
          title: chatModeLabels[parsed.data.mode],
          content: answerContent,
          sourceRefs,
          retrieval: {
            strategy: retrievalStrategy,
            count: context.length,
            scopedLectureCount: lectures.length,
            generation,
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
