import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { ensureFolderHierarchySchema } from '@/lib/folder-hierarchy';

const updateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name too long'),
});

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

    await ensureFolderHierarchySchema();

    const parsed = updateFolderSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid folder update request' },
        { status: 400 },
      );
    }

    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 },
      );
    }

    const duplicateFolder = await prisma.folder.findFirst({
      where: {
        userId: session.user.id,
        name: parsed.data.name,
        parentId: existingFolder.parentId,
        NOT: {
          id: params.id,
        },
      },
    });

    if (duplicateFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder with this name already exists' },
        { status: 400 },
      );
    }

    const folder = await prisma.folder.update({
      where: {
        id: params.id,
      },
      data: {
        name: parsed.data.name,
      },
      include: {
        _count: {
          select: {
            lectures: true,
            children: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        parentId: folder.parentId,
        documentCount: folder._count.lectures,
        folderCount: folder._count.children,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    });
  } catch (error) {
    console.error('Failed to rename folder:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to rename folder' },
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

    await ensureFolderHierarchySchema();

    const folder = await prisma.folder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            lectures: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 },
      );
    }

    if (folder._count.lectures > 0) {
      return NextResponse.json(
        { success: false, error: 'Delete or move materials before deleting this folder' },
        { status: 400 },
      );
    }

    if (folder._count.children > 0) {
      return NextResponse.json(
        { success: false, error: 'Delete nested folders before deleting this folder' },
        { status: 400 },
      );
    }

    await prisma.folder.delete({
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
    console.error('Failed to delete folder:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to delete folder' },
      { status: 500 },
    );
  }
}
