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
import { parseMinioEndpoint } from '@/lib/minio-config';
import { createStableSegmentHash, parseDocumentBuffer } from '@/lib/document-ingestion';
// import { DocumentParserFactory } from '@study-assistant/shared'; // Temporarily commented to test

// 支持的文件类型
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
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

function createMinioClient(): MinioClient {
  const endpoint = parseMinioEndpoint(process.env.MINIO_ENDPOINT, process.env.MINIO_PORT);

  return new MinioClient({
    endPoint: endpoint.endPoint,
    port: endpoint.port,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  });
}

async function ensureBucketExists(minioClient: MinioClient, bucketName: string) {
  const bucketExists = await minioClient.bucketExists(bucketName);

  if (!bucketExists) {
    console.log('🪣 Bucket missing, creating:', bucketName);
    await minioClient.makeBucket(bucketName);
  }
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
    const minioClient = createMinioClient();

    const bucketName = process.env.MINIO_BUCKET_NAME || 'study-assistant';
    
    // 检查bucket是否存在
    console.log('🔄 检查bucket存在性...');
    await ensureBucketExists(minioClient, bucketName);
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
    const fileType = file.type === 'application/pdf' ? 'PDF' : 'TXT';

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

    // 触发文档解析（异步处理，不阻塞响应）
    console.log('🔄 Triggering document processing...');
    
    // 直接调用处理函数（不使用动态import）
    console.log('🔄 Starting document processing...');
    console.log('📄 Using direct function call for document processing');
    
    // 异步执行处理，不阻塞响应
    processDocumentInternal(lecture.id, session.user.id).then(result => {
      console.log('✅ Document processing completed successfully:', {
        segmentCount: result.data.segmentCount,
        status: result.success
      });
    }).catch(error => {
      console.error('❌ Document processing failed:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    });

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
        message: 'File uploaded successfully. Processing started in background.',
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

// Create MinIO client factory to avoid import-time initialization
function createProcessingMinioClient(): MinioClient {
  console.log('🔧 Creating MinIO client for document processing...');
  
  const endpoint = parseMinioEndpoint(process.env.MINIO_ENDPOINT, process.env.MINIO_PORT);
  
  console.log(`🔧 MinIO config: endpoint=${endpoint.endPoint}, port=${endpoint.port}`);
  
  return new MinioClient({
    endPoint: endpoint.endPoint,
    port: endpoint.port,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  });
}

// Process document function - moved from separate file to avoid dynamic import issues
async function processDocumentInternal(lectureId: string, userId: string) {
  console.log('📄 Processing document internally:', lectureId, 'for user:', userId);
  console.log('🔍 Memory usage before processing:', process.memoryUsage());

  // Set timeout for the entire process
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Document processing timeout (5 minutes)')), 5 * 60 * 1000);
  });

  try {
    // Skip authentication since we already have userId
    console.log('✅ Using provided userId:', userId);

    // Get lecture from database
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      include: {
        folder: true,
        segments: true
      }
    });

    if (!lecture) {
      throw new Error('Lecture not found');
    }

    // Check ownership
    if (lecture.userId !== userId) {
      console.log('❌ Ownership check failed:', { lectureUserId: lecture.userId, requestUserId: userId });
      throw new Error('Access denied');
    }
    console.log('✅ Ownership verified');

    // Check if already processed
    if (lecture.status === 'PROCESSED' && lecture.segments.length > 0) {
      return {
        success: true,
        data: {
          message: 'Document already processed',
          lecture,
          segmentCount: lecture.segments.length
        }
      };
    }

    // Update status to processing
    await prisma.lecture.update({
      where: { id: lectureId },
      data: { status: 'PROCESSING' }
    });

    // Check file size limits before processing
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
    if (lecture.fileSize && lecture.fileSize > MAX_FILE_SIZE) {
      console.log(`❌ File too large: ${lecture.fileSize} bytes (max: ${MAX_FILE_SIZE})`);
      await prisma.lecture.update({
        where: { id: lectureId },
        data: { status: 'FAILED' }
      });
      throw new Error(`File size ${Math.round(lecture.fileSize / (1024 * 1024))}MB exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Download file from MinIO with streaming and timeout
    console.log('📥 Downloading file from MinIO:', lecture.fileKey);
    console.log('📊 Expected file size:', lecture.fileSize);
    const bucketName = process.env.MINIO_BUCKET_NAME || 'study-assistant';
    
    // Create MinIO client just before use
    const minioClient = createProcessingMinioClient();
    
    let fileBuffer: Buffer | null;
    try {
      const downloadPromise = (async () => {
        const chunks: Buffer[] = [];
        const stream = await minioClient.getObject(bucketName, lecture.fileKey);
        
        let downloadedSize = 0;
        for await (const chunk of stream) {
          chunks.push(chunk);
          downloadedSize += chunk.length;
          
          // Progress logging for large files
          if (downloadedSize > 10 * 1024 * 1024) { // Log every 10MB
            console.log(`📥 Downloaded ${Math.round(downloadedSize / (1024 * 1024))}MB...`);
          }
          
          // Prevent excessive memory usage
          if (downloadedSize > MAX_FILE_SIZE) {
            throw new Error(`File download exceeded maximum size during streaming: ${downloadedSize} bytes`);
          }
        }
        
        return Buffer.concat(chunks);
      })();
      
      fileBuffer = await Promise.race([downloadPromise, timeoutPromise]);
      console.log('✅ File downloaded, actual size:', fileBuffer.length);
      console.log('🔍 Memory usage after download:', process.memoryUsage());
      
    } catch (error) {
      console.error('❌ File download error:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Parse document with timeout and memory monitoring
    console.log('🔍 Parsing document, type:', lecture.type);
    console.log('📊 Pre-parse memory:', process.memoryUsage());
    let parsedDoc: {
      content: string;
      metadata: Record<string, unknown>;
      segments: Array<{
        content: string;
        page: number | null;
        charStart: number;
        charEnd: number;
      }>;
    };
    try {
      parsedDoc = await parseDocumentBuffer({
        buffer: fileBuffer,
        lectureType: lecture.type,
      });

      if (parsedDoc.segments.length === 0) {
        throw new Error('No readable text segments were extracted from this document.');
      }

      console.log('✅ Document parsed, segments:', parsedDoc.segments.length);
      console.log('📊 Post-parse memory:', process.memoryUsage());
      
    } catch (error) {
      console.error('❌ Document parsing error:', error);
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Clear file buffer from memory
    fileBuffer = null;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('♻️ Garbage collection triggered');
    }

    // Save segments to database
    const savedSegments = await Promise.all(
      parsedDoc.segments.map((segment, index) =>
        prisma.segment.create({
          data: {
            lectureId: lecture.id,
            text: segment.content, // Prisma schema uses 'text' field, not 'content'
            tokenCount: segment.content.split(/\s+/).length, // Calculate token count from content
            page: segment.page,
            charStart: segment.charStart,
            charEnd: segment.charEnd,
            hash: createStableSegmentHash(lecture.id, segment.content, index),
          }
        })
      )
    );

    // Update lecture with parsed content and metadata
    const updatedLecture = await prisma.lecture.update({
      where: { id: lectureId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        // content字段不存在于数据库schema中，移除它
        meta: {
          ...(lecture.meta && typeof lecture.meta === 'object' && !Array.isArray(lecture.meta) ? lecture.meta : {}),
          ...parsedDoc.metadata,
          processedAt: new Date().toISOString(),
          segmentCount: savedSegments.length,
          wordCount: parsedDoc.content.split(/\s+/).length,
          // 将内容保存到meta中而不是单独的content字段
          content: parsedDoc.content
        }
      },
      include: {
        segments: true,
        folder: true
      }
    });

    console.log('✅ Document processing complete');
    console.log('📊 Final memory usage:', process.memoryUsage());

    return {
      success: true,
      data: {
        lecture: updatedLecture,
        segmentCount: savedSegments.length,
        metadata: parsedDoc.metadata
      }
    };

  } catch (error) {
    console.error('❌ Document processing error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Error type:', typeof error);
    console.error('📊 Memory usage at error:', process.memoryUsage());
    
    // Update status to failed with error details
    try {
      await prisma.lecture.update({
        where: { id: lectureId },
        data: { 
          status: 'FAILED',
          meta: {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString()
          }
        }
      });
      console.log('📝 Lecture status updated to FAILED with error details');
    } catch (updateError) {
      console.error('❌ Failed to update lecture status:', updateError);
    }

    // Force cleanup
    if (global.gc) {
      global.gc();
      console.log('♻️ Emergency garbage collection triggered');
    }

    throw error;
  }
}
