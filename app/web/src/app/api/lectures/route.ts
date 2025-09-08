/**
 * 文档上传API端点
 * 处理文件上传、验证和存储
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createStorageService } from '@study-assistant/shared';
import { prisma } from '@study-assistant/db';
import { z } from 'zod';

// 支持的文件类型
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
} as const;

// 最大文件大小 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 请求验证schema
const uploadSchema = z.object({
  folderId: z.string().uuid('Invalid folder ID'),
  title: z.string().optional(),
});

interface UploadRequest {
  file: File;
  folderId: string;
  title?: string;
}

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

    // 解析FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const title = formData.get('title') as string | null;

    // 验证文件存在
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 验证请求参数
    try {
      uploadSchema.parse({ folderId, title: title || undefined });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported file type. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        },
        { status: 400 }
      );
    }

    // 验证文件夹权限
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: session.user.id,
      },
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // 创建存储服务
    const storage = createStorageService();
    await storage.initialize();

    // 转换文件为Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 生成唯一文件名
    const fileKey = storage.generateUniqueKey(file.name, session.user.id);

    // 上传到MinIO
    const uploadResult = await storage.uploadFile(fileKey, buffer, {
      contentType: file.type,
      metadata: {
        'original-name': file.name,
        'user-id': session.user.id,
        'folder-id': folderId,
        'upload-date': new Date().toISOString(),
      },
    });

    // 确定文件类型
    const fileType = file.type === 'application/pdf' ? 'PDF' :
                     file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ? 'PPTX' :
                     'TXT';

    // 保存到数据库
    const lecture = await prisma.lecture.create({
      data: {
        title: title || file.name.replace(/\.[^/.]+$/, ''), // 移除扩展名
        type: fileType,
        status: 'PROCESSING',
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileSize: uploadResult.size,
        originalName: file.name,
        folderId: folderId,
        userId: session.user.id,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`📄 File uploaded successfully: ${file.name} -> ${uploadResult.key}`);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        id: lecture.id,
        title: lecture.title,
        type: lecture.type,
        status: lecture.status,
        fileUrl: lecture.fileUrl,
        fileSize: lecture.fileSize,
        originalName: lecture.originalName,
        folder: lecture.folder,
        createdAt: lecture.createdAt,
      },
    });

  } catch (error) {
    console.error('❌ File upload error:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'File upload failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// 获取用户的文档列表
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

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const where: any = {
      userId: session.user.id,
    };

    if (folderId) {
      where.folderId = folderId;
    }

    if (status && ['PROCESSING', 'PROCESSED', 'FAILED'].includes(status)) {
      where.status = status;
    }

    if (type && ['PDF', 'PPTX', 'TXT'].includes(type)) {
      where.type = type;
    }

    // 查询文档
    const [lectures, total] = await Promise.all([
      prisma.lecture.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lecture.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        lectures,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to fetch lectures:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch lectures' 
      },
      { status: 500 }
    );
  }
}