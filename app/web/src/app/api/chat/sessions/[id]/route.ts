import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { authOptions } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        messages: {
          select: {
            id: true,
            role: true,
            mode: true,
            title: true,
            content: true,
            sourceRefs: true,
            retrieval: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { success: false, error: 'Chat session not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: chatSession.id,
          title: chatSession.title,
          messages: chatSession.messages.map((message) => ({
            id: message.id,
            sessionId: chatSession.id,
            role: message.role === 'USER' ? 'user' : 'assistant',
            mode: message.mode,
            title: message.title || undefined,
            content: message.content,
            sourceRefs: message.sourceRefs || undefined,
            retrieval: message.retrieval || undefined,
            isStreaming: false,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Failed to load chat session:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to load chat session' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { success: false, error: 'Chat session not found' },
        { status: 404 },
      );
    }

    await prisma.chatSession.delete({
      where: {
        id: chatSession.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: chatSession.id,
      },
    });
  } catch (error) {
    console.error('Failed to delete chat session:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to delete chat session' },
      { status: 500 },
    );
  }
}
