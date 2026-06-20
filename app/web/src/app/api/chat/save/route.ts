import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { saveChatOutputAsArtifact, saveChatOutputSchema } from '@/lib/chat-save-artifact';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const parsed = saveChatOutputSchema.safeParse(await request.json());

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
