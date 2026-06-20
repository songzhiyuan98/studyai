import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma, prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { formatSourceRef } from '@/lib/reader-format';
import {
  compactContextText,
  mergeHybridContext,
  retrieveBroadCoverageContext,
  retrieveContextForPageRequest,
  retrieveContextForQuery,
  type RetrievedContext,
} from '@/lib/rag-context';
import { resolveExplicitLectureScope } from '@/lib/source-scope';
import { buildCasualChatAnswer, buildChatAnswer, chatModeLabels } from '@/lib/chat-answer';
import { formatLibraryCatalogForPlanner, planChatTurnWithAi, type ChatTurnPlan } from '@/lib/chat-planner';
import { parseChatSourceRefs, saveChatOutputAsArtifact, saveChatOutputSchema } from '@/lib/chat-save-artifact';
import {
  buildHistoryAwareRetrievalQuery,
  chunkTextForLocalStream,
  generateGroundedChatAnswer,
  getChatModelConfig,
  streamGroundedChatAnswer,
  type ChatHistoryTurn,
} from '@/lib/chat-llm';
import { CHAT_CONTEXT_SEGMENT_FETCH_LIMIT, getChatContextCharBudget } from '@/lib/chat-context-budget';
import { createEmbeddings, isEmbeddingConfigured } from '@/lib/embeddings';
import { resolveLibraryScope } from '@/lib/library-catalog';
import { buildLecturePackContext } from '@/lib/lecture-pack';
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

function getChatSourceVectorStatus(lecture: {
  status: string;
  meta?: unknown;
  _count?: {
    segments?: number;
  };
}) {
  const meta = lecture.meta && typeof lecture.meta === 'object' && !Array.isArray(lecture.meta)
    ? lecture.meta as { embeddingStatus?: string; embeddedSegmentCount?: number }
    : {};
  const segmentCount = lecture._count?.segments || 0;
  const embeddedCount = meta.embeddedSegmentCount || 0;

  if (lecture.status !== 'PROCESSED') return 'Not indexed yet';
  if (meta.embeddingStatus === 'completed' && embeddedCount >= segmentCount) return 'Vector ready';
  if (meta.embeddingStatus === 'disabled') return 'Lexical ready';
  if (segmentCount > 0) return meta.embeddingStatus === 'completed' ? 'Partial vectors' : 'Needs vector index';
  return 'No chunks yet';
}

const streamEncoder = new TextEncoder();
const CHAT_STREAM_DELAY_MS = 28;
const CHAT_HISTORY_LOAD_LIMIT = 24;
const CHAT_HISTORY_RECENT_WINDOW = 8;

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

function getPlannerTrace(chatPlan: ChatTurnPlan) {
  return {
    plannerSource: chatPlan.plannerSource,
    plannerModel: chatPlan.plannerModel,
    plannerRationale: chatPlan.plannerRationale,
  };
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
        status: true,
        meta: true,
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
          detail: `${lecture.folder?.name || 'Library'} · ${lecture.type} · ${lecture._count.segments} chunks · ${getChatSourceVectorStatus(lecture)}`,
          vectorStatus: getChatSourceVectorStatus(lecture),
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
      take: CHAT_HISTORY_LOAD_LIMIT,
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

    const plannerCatalogLectures = await prisma.lecture.findMany({
      where: {
        userId: session.user.id,
        status: 'PROCESSED',
      },
      select: {
        title: true,
        originalName: true,
        courseId: true,
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
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    const chatPlan = await planChatTurnWithAi({
      mode: parsed.data.mode,
      message: parsed.data.message,
      history: recentHistory,
      hasExplicitScope: Boolean(scopedLectureIds?.length),
      libraryCatalog: formatLibraryCatalogForPlanner(plannerCatalogLectures),
    });
    const shouldRetrieveSources = chatPlan.requiresRetrieval;

    if (chatPlan.intent === 'save_request') {
      const recentAssistantMessages = await prisma.chatMessage.findMany({
        where: {
          sessionId: chatSession.id,
          userId: session.user.id,
          role: 'ASSISTANT',
        },
        select: {
          mode: true,
          title: true,
          content: true,
          sourceRefs: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
      const saveCandidate = recentAssistantMessages
        .map((assistantMessage) => ({
          ...assistantMessage,
          sourceRefs: parseChatSourceRefs(assistantMessage.sourceRefs),
        }))
        .find((assistantMessage) => assistantMessage.content.trim() && assistantMessage.sourceRefs.length > 0);
      const parsedSaveOutput = saveCandidate
        ? saveChatOutputSchema.safeParse({
          mode: saveCandidate.mode || 'free',
          title: saveCandidate.title || 'Saved chat output',
          content: saveCandidate.content,
          sourceRefs: saveCandidate.sourceRefs,
        })
        : null;
      const artifact = parsedSaveOutput?.success
        ? await saveChatOutputAsArtifact({
          userId: session.user.id,
          output: parsedSaveOutput.data,
          generationMode: 'chat_planner_artifact_save_v0',
        })
        : null;
      const saveResponseContent = artifact
        ? `Saved "${artifact.title}" to Saved.`
        : 'I could not find a recent source-grounded answer to save yet. Ask me to generate an answer from your Library first, then I can save it.';
      const retrievalTrace = {
        strategy: 'tool_artifact_save_v0',
        count: artifact ? 1 : 0,
        scopedLectureCount: 0,
        historyCount: recentHistory.length,
        historyTurnsLoaded: recentHistory.length,
        historyTurnsCompacted: Math.max(0, recentHistory.length - CHAT_HISTORY_RECENT_WINDOW),
        query: 'tool_call',
        plan: chatPlan,
        ...getPlannerTrace(chatPlan),
        plannerCatalogCount: plannerCatalogLectures.length,
        toolResult: artifact ? 'saved' : 'no_candidate',
      };

      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          userId: session.user.id,
          role: 'ASSISTANT',
          mode: parsed.data.mode,
          title: artifact ? 'Saved output' : 'Nothing to save yet',
          content: saveResponseContent,
          sourceRefs: artifact?.sourceRefs || [],
          retrieval: retrievalTrace,
        },
      });
      await touchChatSession(chatSession.id);

      return NextResponse.json({
        success: true,
        data: {
          message: {
            sessionId: chatSession.id,
            role: 'assistant',
            title: artifact ? 'Saved output' : 'Nothing to save yet',
            content: saveResponseContent,
            sourceRefs: artifact?.sourceRefs || [],
            retrieval: retrievalTrace,
          },
        },
      });
    }

    if (chatPlan.intent === 'reader_navigation') {
      const recentAssistantMessages = await prisma.chatMessage.findMany({
        where: {
          sessionId: chatSession.id,
          userId: session.user.id,
          role: 'ASSISTANT',
        },
        select: {
          sourceRefs: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
      const recentRefs = recentAssistantMessages.flatMap((assistantMessage) => (
        parseChatSourceRefs(assistantMessage.sourceRefs)
      ));
      const requestedPageRef = chatPlan.requestedPage
        ? recentRefs.find((sourceRef) => sourceRef.page === chatPlan.requestedPage)
        : undefined;
      const targetRef = requestedPageRef || recentRefs[0];
      const readerResponseContent = targetRef
        ? `I found the source reference${chatPlan.requestedPage ? ` for page ${chatPlan.requestedPage}` : ''}. Open it from the citation below.`
        : 'I could not find a recent cited source to open yet. Ask me a source-grounded question first, then I can jump you to the original material.';
      const sourceRefs = targetRef ? [targetRef] : [];
      const retrievalTrace = {
        strategy: 'tool_reader_open_v0',
        count: sourceRefs.length,
        scopedLectureCount: targetRef ? 1 : 0,
        historyCount: recentHistory.length,
        historyTurnsLoaded: recentHistory.length,
        historyTurnsCompacted: Math.max(0, recentHistory.length - CHAT_HISTORY_RECENT_WINDOW),
        query: 'tool_call',
        plan: chatPlan,
        ...getPlannerTrace(chatPlan),
        plannerCatalogCount: plannerCatalogLectures.length,
        toolResult: targetRef ? 'reader_link_ready' : 'no_recent_source',
      };

      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          userId: session.user.id,
          role: 'ASSISTANT',
          mode: parsed.data.mode,
          title: targetRef ? 'Open source' : 'No source to open yet',
          content: readerResponseContent,
          sourceRefs,
          retrieval: retrievalTrace,
        },
      });
      await touchChatSession(chatSession.id);

      return NextResponse.json({
        success: true,
        data: {
          message: {
            sessionId: chatSession.id,
            role: 'assistant',
            title: targetRef ? 'Open source' : 'No source to open yet',
            content: readerResponseContent,
            sourceRefs,
            retrieval: retrievalTrace,
          },
        },
      });
    }

    if (!shouldRetrieveSources) {
      const sourceRefs: never[] = [];
      const retrievalTrace = {
        strategy: 'no_retrieval_casual_chat_v0',
        count: 0,
        scopedLectureCount: 0,
        historyCount: recentHistory.length,
        historyTurnsLoaded: recentHistory.length,
        historyTurnsCompacted: Math.max(0, recentHistory.length - CHAT_HISTORY_RECENT_WINDOW),
        query: 'not_requested',
        plan: chatPlan,
        ...getPlannerTrace(chatPlan),
        plannerCatalogCount: plannerCatalogLectures.length,
      };
      const generationInput = {
        mode: parsed.data.mode,
        message: parsed.data.message,
        contextText: '',
        history: recentHistory,
        sources: [],
        delegatedAgent: chatPlan.delegatedAgent,
      };
      const fallbackAnswerContent = buildCasualChatAnswer({ message: parsed.data.message });

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
              console.error('Streaming casual chat generation failed, falling back locally:', generationError);
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

      let answerContent = fallbackAnswerContent;
      let generation = {
        provider: 'local_fallback',
        model: 'deterministic',
      };

      try {
        const generatedAnswer = await generateGroundedChatAnswer(generationInput);
        if (generatedAnswer) {
          answerContent = generatedAnswer.content;
          generation = {
            provider: generatedAnswer.provider,
            model: generatedAnswer.model,
          };
        }
      } catch (generationError) {
        console.error('Casual chat generation failed, falling back locally:', generationError);
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
              ...retrievalTrace,
              generation,
            },
          },
        },
      });
    }

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
          take: CHAT_CONTEXT_SEGMENT_FETCH_LIMIT,
        },
      },
      take: 20,
    });

    const retrievalQuery = buildHistoryAwareRetrievalQuery({
      message: parsed.data.message,
      history: recentHistory,
    });
    const libraryScope = resolveLibraryScope({
      lectures,
      query: retrievalQuery,
      explicitLectureIds: scopedLectureIds,
    });
    const titleScope = libraryScope.narrowed
      ? null
      : resolveExplicitLectureScope({
        lectures,
        query: retrievalQuery,
      });
    const explicitScope = titleScope || libraryScope;
    const activeLectures = explicitScope.lectures;
    const lectureLabels = Object.fromEntries(activeLectures.map((lecture) => [
      lecture.id,
      lecture.title || lecture.originalName || 'Source',
    ]));
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
    const effectiveContextStrategy = chatPlan.contextStrategy === 'lecture_pack' && activeSegmentCount > 80
      ? 'long_document_map'
      : chatPlan.contextStrategy;

    if (candidateSegments.length === 0) {
      const noSourcesContent = 'I could not find processed source passages in your Library yet. Upload a PDF or TXT file in Library first, then come back and ask me to study it with you.';
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
    const usesLecturePack = effectiveContextStrategy === 'lecture_pack';
    const usesBroadCoverage = chatPlan.retrievalBreadth === 'broad_assessment'
      || chatPlan.retrievalBreadth === 'broad_lesson'
      || effectiveContextStrategy === 'long_document_map';
    const contextCharBudget = getChatContextCharBudget({
      contextStrategy: effectiveContextStrategy,
    });
    const broadCoverageResults = usesBroadCoverage && !usesLecturePack
      ? retrieveBroadCoverageContext({
        query: retrievalQuery,
        candidateSegments,
        perLecture: chatPlan.retrievalBreadth === 'broad_lesson' ? 6 : 4,
        limit: chatPlan.retrievalBreadth === 'broad_lesson' ? 20 : 16,
      })
      : [];
    const pageResults = usesLecturePack
      ? []
      : retrieveContextForPageRequest({
        query: retrievalQuery,
        candidateSegments,
        limit: 8,
      });
    const lexicalResults = usesLecturePack
      ? []
      : retrieveContextForQuery({
        query: retrievalQuery,
        candidateSegments,
        limit: 8,
      });

    if (!usesLecturePack && pageResults.length === 0 && broadCoverageResults.length === 0) {
      try {
        vectorResults = await retrieveVectorContext({
          query: retrievalQuery,
          userId: session.user.id,
          lectureIds: retrievalLectureIds,
          limit: 8,
        });
      } catch (vectorError) {
        console.error('Vector retrieval failed, falling back to lexical:', vectorError);
      }
    }

    let retrieved: RetrievedContext[];
    let lecturePackContextText = '';
    let lecturePackSummary: {
      totalSegments: number;
      includedSegments: number;
      truncated: boolean;
      maxChars: number;
    } | null = null;
    if (usesLecturePack) {
      const lecturePack = buildLecturePackContext({
        candidateSegments,
        maxChars: contextCharBudget,
        lectureLabels,
      });
      lecturePackContextText = lecturePack.contextText;
      lecturePackSummary = {
        totalSegments: lecturePack.totalSegments,
        includedSegments: lecturePack.includedSegments,
        truncated: lecturePack.truncated,
        maxChars: lecturePack.maxChars,
      };
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
        : chatPlan.retrievalBreadth === 'broad_lesson'
        ? 'broad_lesson_v0'
        : 'broad_assessment_v0';
    } else if (pageResults.length > 0) {
      retrieved = pageResults.slice(0, 6);
      retrievalStrategy = 'exact_page_v0';
    } else if (vectorResults.length > 0 && lexicalResults.length > 0) {
      retrieved = mergeHybridContext({
        vectorResults,
        lexicalResults,
        limit: 6,
      });
      retrievalStrategy = 'hybrid_vector_lexical_v0';
    } else if (vectorResults.length > 0) {
      retrieved = vectorResults.slice(0, 6);
      retrievalStrategy = 'pgvector_embedding_v0';
    } else {
      retrieved = lexicalResults.slice(0, 6);
    }

    const fallbackSegments: RetrievedContext[] = candidateSegments.slice(0, 3).map((segment) => ({
      segment,
      score: 0,
      reason: 'lexical' as const,
    }));
    const context = retrieved.length > 0 ? retrieved : fallbackSegments;
    const contextSummary = lecturePackSummary || {
      totalSegments: candidateSegments.length,
      includedSegments: context.length,
      truncated: context.length < candidateSegments.length,
      maxChars: contextCharBudget,
    };
    const contextText = usesLecturePack
      ? lecturePackContextText
      : compactContextText(
        context.map(({ segment }) => segment),
        contextSummary.maxChars,
      );
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
      delegatedAgent: chatPlan.delegatedAgent,
      contextStrategy: effectiveContextStrategy,
      contextSummary,
      resolvedScope: {
        source: libraryScope.source,
        confidence: libraryScope.confidence,
        matchedLabels: libraryScope.matchedLabels,
        reason: libraryScope.reason,
      },
    };
    const retrievalTrace = {
      strategy: retrievalStrategy,
      count: context.length,
      scopedLectureCount: activeLectures.length,
      historyCount: recentHistory.length,
      historyTurnsLoaded: recentHistory.length,
      historyTurnsCompacted: Math.max(0, recentHistory.length - CHAT_HISTORY_RECENT_WINDOW),
      query: recentHistory.length > 0 ? 'history_aware' : 'current_message',
      contextStrategy: effectiveContextStrategy,
      plannedContextStrategy: chatPlan.contextStrategy,
      contextStrategyAdjusted: effectiveContextStrategy !== chatPlan.contextStrategy,
      contextSummary,
      contextCharBudget,
      candidateSegmentCount: candidateSegments.length,
      activeSegmentCount,
      sourceScope: libraryScope.source === 'all_ready' && titleScope?.narrowed
        ? 'lecture_title'
        : libraryScope.source,
      libraryScope,
      plan: chatPlan,
      ...getPlannerTrace(chatPlan),
      plannerCatalogCount: plannerCatalogLectures.length,
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
            ...retrievalTrace,
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
