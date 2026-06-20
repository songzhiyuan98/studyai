import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@study-assistant/db';
import { authOptions } from '@/lib/auth';

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

    const item = await prisma.item.findFirst({
      where: {
        id: params.id,
        selection: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        selectionId: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Saved output not found' },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.item.delete({
        where: {
          id: item.id,
        },
      });

      const remainingItems = await tx.item.count({
        where: {
          selectionId: item.selectionId,
        },
      });

      if (remainingItems === 0) {
        await tx.selection.delete({
          where: {
            id: item.selectionId,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
      },
    });
  } catch (error) {
    console.error('Failed to delete saved output:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to delete saved output' },
      { status: 500 },
    );
  }
}
