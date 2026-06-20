import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { authOptions } from '@/lib/auth';

function formatRelativeChatTime(date: Date) {
  const now = Date.now();
  const timestamp = date.getTime();
  const diffMs = Math.max(0, now - timestamp);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
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

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 8,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map((chatSession) => ({
          id: chatSession.id,
          title: chatSession.title,
          time: formatRelativeChatTime(chatSession.updatedAt),
          messageCount: chatSession._count.messages,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to load chat sessions:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to load chat sessions' },
      { status: 500 },
    );
  }
}
