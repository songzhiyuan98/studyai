/**
 * 文件夹管理API端点
 * 处理文件夹的创建、获取等操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';
import { ensureFolderHierarchySchema } from '@/lib/folder-hierarchy';

// 请求验证schema
const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name too long'),
  description: z.string().optional(),
  parentId: z.string().min(1).nullable().optional(),
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

    await ensureFolderHierarchySchema();

    // 获取文件夹列表，包含文档数量
    const folders = await prisma.folder.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 格式化返回数据
    const formattedFolders = folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      documentCount: folder._count.lectures,
      folderCount: folder._count.children,
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

    await ensureFolderHierarchySchema();

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

    const { name, description, parentId = null } = validationResult.data;

    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          userId: session.user.id,
        },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { success: false, error: 'Parent folder not found' },
          { status: 404 }
        );
      }
    }

    // 检查是否存在同名文件夹
    const existingFolder = await prisma.folder.findFirst({
      where: {
        userId: session.user.id,
        name: name,
        parentId,
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
        parentId,
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

    console.log(`📁 Folder created: ${name} by ${session.user.email}`);

    // 返回成功响应
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
