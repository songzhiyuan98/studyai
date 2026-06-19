import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

const updateLectureSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').optional(),
  folderId: z.string().min(1).optional(),
});

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

export async function PATCH(
  request: NextRequest,
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

    const parsed = updateLectureSchema.safeParse(await request.json());

    if (!parsed.success || (!parsed.data.title && !parsed.data.folderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lecture update request' },
        { status: 400 },
      );
    }

    const lecture = await prisma.lecture.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!lecture) {
      return NextResponse.json(
        { success: false, error: 'Lecture not found' },
        { status: 404 },
      );
    }

    if (parsed.data.folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: parsed.data.folderId,
          userId: session.user.id,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: 'Folder not found' },
          { status: 404 },
        );
      }
    }

    const updatedLecture = await prisma.lecture.update({
      where: {
        id: params.id,
      },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.folderId ? { folderId: parsed.data.folderId } : {}),
      },
      include: {
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
    });

    return NextResponse.json({
      success: true,
      data: {
        lecture: updatedLecture,
      },
    });
  } catch (error) {
    console.error('Failed to update lecture:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to update lecture' },
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

    const lecture = await prisma.lecture.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!lecture) {
      return NextResponse.json(
        { success: false, error: 'Lecture not found' },
        { status: 404 },
      );
    }

    await prisma.lecture.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: params.id,
      },
    });
  } catch (error) {
    console.error('Failed to delete lecture:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to delete lecture' },
      { status: 500 },
    );
  }
}
