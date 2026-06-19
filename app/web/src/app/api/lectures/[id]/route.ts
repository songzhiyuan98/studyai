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

    const lecture = await prisma.lecture.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        folder: {
          select: {
            id: true,
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
        },
      },
    });

    if (!lecture) {
      return NextResponse.json(
        { success: false, error: 'Lecture not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        lecture,
      },
    });
  } catch (error) {
    console.error('Failed to fetch lecture detail:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch lecture detail' },
      { status: 500 },
    );
  }
}
