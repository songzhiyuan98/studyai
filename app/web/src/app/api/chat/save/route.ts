import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { saveChatOutputAsArtifact, saveChatOutputSchema } from '@/lib/chat-save-artifact';

const saveChatRequestSchema = saveChatOutputSchema.extend({
  chatMessageId: z.string().min(1).optional(),
});

function mergeSavedArtifactId(retrieval: unknown, artifactId: string) {
  const retrievalObject = retrieval && typeof retrieval === 'object' && !Array.isArray(retrieval)
    ? retrieval as Record<string, unknown>
    : {};

  return {
    ...retrievalObject,
    savedArtifactId: artifactId,
  };
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

    const parsed = saveChatRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid saved chat output request' },
        { status: 400 },
      );
    }

    const artifact = await saveChatOutputAsArtifact({
      userId: session.user.id,
      output: parsed.data,
    });

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: 'No valid source references were found for this saved output' },
        { status: 400 },
      );
    }

    if (parsed.data.chatMessageId && artifact.id) {
      const chatMessage = await prisma.chatMessage.findFirst({
        where: {
          id: parsed.data.chatMessageId,
          userId: session.user.id,
          role: 'ASSISTANT',
        },
        select: {
          id: true,
          retrieval: true,
        },
      });

      if (chatMessage) {
        await prisma.chatMessage.update({
          where: {
            id: chatMessage.id,
          },
          data: {
            retrieval: mergeSavedArtifactId(chatMessage.retrieval, artifact.id),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        artifact,
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
