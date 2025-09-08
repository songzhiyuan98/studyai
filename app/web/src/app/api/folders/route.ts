/**
 * 文件夹管理API端点
 * 处理文件夹的创建、获取等操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';

// 请求验证schema
const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name too long'),
  description: z.string().optional(),
});

// 获取用户的文件夹列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取文件夹列表，包含文档数量
    const folders = await prisma.folder.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            lectures: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 格式化返回数据
    const formattedFolders = folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      documentCount: folder._count.lectures,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedFolders,
    });

  } catch (error) {
    console.error('❌ Failed to fetch folders:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch folders' 
      },
      { status: 500 }
    );
  }
}

// 创建新文件夹
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();

    // 验证请求参数
    const validationResult = createFolderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { name, description } = validationResult.data;

    // 检查是否存在同名文件夹
    const existingFolder = await prisma.folder.findFirst({
      where: {
        userId: session.user.id,
        name: name,
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder with this name already exists' },
        { status: 400 }
      );
    }

    // 创建文件夹
    const folder = await prisma.folder.create({
      data: {
        name,
        description: description || null,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            lectures: true,
          },
        },
      },
    });

    console.log(`📁 Folder created: ${name} by ${session.user.email}`);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        documentCount: folder._count.lectures,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    });

  } catch (error) {
    console.error('❌ Failed to create folder:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create folder' 
      },
      { status: 500 }
    );
  }
}