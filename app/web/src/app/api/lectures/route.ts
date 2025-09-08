/**
 * 文档上传API端点
 * 处理文件上传、验证和存储
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
// import { createStorageService } from '@study-assistant/shared';
import { Client as MinioClient } from 'minio';
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
  folderId: z.string().min(1, 'Folder ID is required'),
  title: z.string().optional(),
});

interface UploadRequest {
  file: File;
  folderId: string;
  title?: string;
}

export async function POST(request: NextRequest) {
  console.log('📥 收到文件上传请求');
  
  try {
    // 验证用户认证
    const session = await getServerSession(authOptions);
    console.log('👤 用户认证状态:', !!session?.user, session?.user?.id);
    
    if (!session?.user) {
      console.log('❌ 用户未认证');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析FormData
    console.log('📋 解析FormData...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const title = formData.get('title') as string | null;
    
    console.log('📄 文件信息:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      folderId,
      title
    });

    // 验证文件存在
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 验证请求参数
    try {
      console.log('🔍 验证参数:', { folderId, title: title || undefined });
      uploadSchema.parse({ folderId, title: title || undefined });
      console.log('✅ 参数验证通过');
    } catch (error) {
      console.error('❌ 参数验证失败:', error);
      if (error instanceof z.ZodError) {
        console.error('   详细错误:', error.errors);
      }
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

    // 创建MinIO客户端
    console.log('🔧 创建MinIO客户端...');
    const minioClient = new MinioClient({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });

    const bucketName = process.env.MINIO_BUCKET_NAME || 'study-assistant';
    
    // 检查bucket是否存在
    console.log('🔄 检查bucket存在性...');
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      console.log('❌ Bucket不存在:', bucketName);
      throw new Error(`Storage bucket '${bucketName}' does not exist`);
    }
    console.log('✅ MinIO客户端和bucket检查完成');

    // 转换文件为Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop();
    const fileKey = `uploads/${session.user.id}/${timestamp}-${random}.${extension}`;
    
    console.log('📤 上传文件到MinIO:', fileKey);

    // 上传到MinIO
    const uploadInfo = await minioClient.putObject(
      bucketName,
      fileKey,
      buffer,
      buffer.length,
      {
        'Content-Type': file.type,
        'original-name': file.name,
        'user-id': session.user.id,
        'folder-id': folderId,
        'upload-date': new Date().toISOString(),
      }
    );

    // 生成访问URL
    const fileUrl = await minioClient.presignedGetObject(bucketName, fileKey, 7 * 24 * 60 * 60); // 7天有效期

    const uploadResult = {
      url: fileUrl,
      key: fileKey,
      size: buffer.length,
    };
    
    console.log('✅ 文件上传成功:', uploadResult);

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
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'Unknown error');
    console.error('❌ Error type:', typeof error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { 
        success: false, 
        error: `File upload failed: ${errorMessage}. Please try again.` 
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