/**
 * 数据库迁移和种子数据工具
 * 用于初始化开发和测试环境
 */

import { prisma } from '../index';

/**
 * 数据库初始化工具类
 */
export class DatabaseMigrations {
  /**
   * 启用pgvector扩展
   * 注意：需要超级用户权限
   */
  static async enableVectorExtension(): Promise<void> {
    try {
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
      console.log('✅ pgvector扩展已启用');
    } catch (error) {
      console.error('❌ 无法启用pgvector扩展:', error);
      throw error;
    }
  }

  /**
   * 创建向量索引
   */
  static async createVectorIndexes(): Promise<void> {
    try {
      // 主要的向量相似度搜索索引
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS segments_embedding_cosine_idx 
        ON segments USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
      `;

      // 支持过滤的复合索引
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS segments_lecture_hash_idx 
        ON segments (lecture_id, hash)
      `;

      console.log('✅ 向量索引创建完成');
    } catch (error) {
      console.error('❌ 创建向量索引失败:', error);
      throw error;
    }
  }

  /**
   * 数据库健康检查
   */
  static async healthCheck(): Promise<{
    connected: boolean;
    vectorExtension: boolean;
    indexesExist: boolean;
  }> {
    try {
      // 检查连接
      await prisma.$queryRaw`SELECT 1`;
      
      // 检查vector扩展
      const vectorExt = await prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `;

      // 检查索引
      const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'segments' 
        AND indexname LIKE '%embedding%'
      `;

      return {
        connected: true,
        vectorExtension: vectorExt.length > 0,
        indexesExist: indexes.length > 0
      };
    } catch (error) {
      console.error('数据库健康检查失败:', error);
      return {
        connected: false,
        vectorExtension: false,
        indexesExist: false
      };
    }
  }

  /**
   * 清理开发数据
   * 危险操作：仅在开发环境使用
   */
  static async resetDevelopmentData(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('不能在生产环境执行数据重置');
    }

    console.log('⚠️  正在清理开发数据...');

    // 按依赖关系顺序删除
    await prisma.examAttempt.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.item.deleteMany();
    await prisma.selection.deleteMany();
    await prisma.segment.deleteMany();
    await prisma.lecture.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.job.deleteMany();
    
    // 保留用户和会话数据以便开发
    console.log('✅ 开发数据清理完成');
  }

  /**
   * 创建测试数据
   */
  static async seedTestData(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('不能在生产环境创建测试数据');
    }

    console.log('🌱 正在创建测试数据...');

    // 首先创建一个测试用户和文件夹
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: '测试用户',
        role: 'STUDENT'
      }
    });

    // 创建测试文件夹
    const testFolder = await prisma.folder.upsert({
      where: {
        userId_name: {
          userId: testUser.id,
          name: '机器学习课程'
        }
      },
      update: {},
      create: {
        name: '机器学习课程',
        description: 'AI基础知识学习材料',
        userId: testUser.id
      }
    });

    // 创建测试讲义
    const testLecture = await prisma.lecture.create({
      data: {
        courseId: 'test-course-001',
        folderId: testFolder.id,
        userId: testUser.id,
        type: 'PDF',
        title: '人工智能基础 - 第一章',
        originalName: 'ai-basics-chapter1.pdf',
        fileName: 'ai-basics-chapter1.pdf',
        fileUrl: '/uploads/test/ai-basics-chapter1.pdf',
        fileKey: 'uploads/test-user/ai-basics-chapter1.pdf',
        fileSize: 1024000,
        status: 'PROCESSED',
        meta: {
          pages: 20,
          language: 'zh',
          subject: '人工智能'
        },
        processedAt: new Date()
      }
    });

    // 创建测试片段
    const testSegments = [
      {
        lectureId: testLecture.id,
        text: '人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，致力于创造能够执行通常需要人类智慧的任务的系统。',
        tokenCount: 45,
        page: 1,
        charStart: 0,
        charEnd: 60,
        hash: 'test-hash-001'
      },
      {
        lectureId: testLecture.id,
        text: '机器学习是人工智能的一个子领域，它使计算机能够在没有明确编程的情况下学习和改进。',
        tokenCount: 35,
        page: 1,
        charStart: 61,
        charEnd: 110,
        hash: 'test-hash-002'
      },
      {
        lectureId: testLecture.id,
        text: '深度学习是机器学习的一个分支，它使用人工神经网络来模拟人脑的工作方式。',
        tokenCount: 30,
        page: 2,
        charStart: 0,
        charEnd: 45,
        hash: 'test-hash-003'
      }
    ];

    await prisma.segment.createMany({
      data: testSegments
    });

    console.log('✅ 测试数据创建完成');
    console.log(`   - 用户: ${testUser.name} (${testUser.email})`);
    console.log(`   - 文件夹: ${testFolder.name}`);
    console.log(`   - 讲义: ${testLecture.title}`);
    console.log(`   - 片段: ${testSegments.length}个`);
  }
}