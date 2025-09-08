/**
 * 常用数据库查询工具函数
 * 提供高频使用的数据库操作封装
 */

import { prisma } from '../index';
import type { Lecture, Segment, Selection, Prisma } from '@prisma/client';

/**
 * 讲义相关查询
 */
export class LectureQueries {
  /**
   * 根据课程ID获取所有讲义
   */
  static async getByCourse(courseId: string): Promise<Lecture[]> {
    return prisma.lecture.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { segments: true }
        }
      }
    });
  }

  /**
   * 创建新讲义记录
   */
  static async create(data: {
    courseId: string;
    type: 'PDF' | 'PPTX' | 'TXT';
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    meta?: any;
  }): Promise<Lecture> {
    return prisma.lecture.create({
      data: {
        ...data,
        status: 'PENDING'
      }
    });
  }

  /**
   * 更新处理状态
   */
  static async updateStatus(
    id: string, 
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    meta?: any
  ): Promise<Lecture> {
    return prisma.lecture.update({
      where: { id },
      data: {
        status,
        meta,
        processedAt: status === 'COMPLETED' ? new Date() : null
      }
    });
  }
}

/**
 * 文档片段相关查询
 */
export class SegmentQueries {
  /**
   * 批量创建片段
   */
  static async createMany(segments: Array<{
    lectureId: string;
    text: string;
    tokenCount: number;
    page?: number;
    slide?: number;
    charStart?: number;
    charEnd?: number;
    bbox?: any;
    hash: string;
  }>): Promise<number> {
    const result = await prisma.segment.createMany({
      data: segments,
      skipDuplicates: true // 跳过重复的hash
    });
    return result.count;
  }

  /**
   * 根据讲义ID获取所有片段
   */
  static async getByLecture(
    lectureId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ segments: Segment[]; total: number }> {
    const where = { lectureId };
    
    const [segments, total] = await Promise.all([
      prisma.segment.findMany({
        where,
        skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
        take: options?.limit,
        orderBy: [
          { page: 'asc' },
          { slide: 'asc' },
          { charStart: 'asc' }
        ]
      }),
      prisma.segment.count({ where })
    ]);

    return { segments, total };
  }

  /**
   * 根据ID列表获取片段
   */
  static async getByIds(ids: string[]): Promise<Segment[]> {
    return prisma.segment.findMany({
      where: { id: { in: ids } },
      orderBy: [
        { page: 'asc' },
        { slide: 'asc' },
        { charStart: 'asc' }
      ]
    });
  }
}

/**
 * 用户选择相关查询
 */
export class SelectionQueries {
  /**
   * 创建新选择
   */
  static async create(data: {
    userId: string;
    lectureId: string;
    segmentIds: string[];
  }): Promise<Selection> {
    return prisma.selection.create({
      data,
      include: {
        lecture: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * 获取用户的选择历史
   */
  static async getByUser(
    userId: string,
    options?: { limit?: number }
  ): Promise<Selection[]> {
    return prisma.selection.findMany({
      where: { userId },
      include: {
        lecture: true,
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit
    });
  }

  /**
   * 根据ID获取选择详情(包含片段)
   */
  static async getWithSegments(id: string): Promise<Selection & {
    segments: Segment[];
  } | null> {
    const selection = await prisma.selection.findUnique({
      where: { id },
      include: {
        lecture: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!selection) return null;

    const segments = await SegmentQueries.getByIds(selection.segmentIds);
    
    return {
      ...selection,
      segments
    };
  }
}

/**
 * 统计查询工具
 */
export class StatsQueries {
  /**
   * 获取系统统计信息
   */
  static async getSystemStats(): Promise<{
    totalUsers: number;
    totalLectures: number;
    totalSegments: number;
    totalSelections: number;
    processingJobs: number;
  }> {
    const [
      totalUsers,
      totalLectures, 
      totalSegments,
      totalSelections,
      processingJobs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lecture.count(),
      prisma.segment.count(),
      prisma.selection.count(),
      prisma.job.count({ where: { status: 'RUNNING' } })
    ]);

    return {
      totalUsers,
      totalLectures,
      totalSegments,
      totalSelections,
      processingJobs
    };
  }

  /**
   * 获取用户使用统计
   */
  static async getUserStats(userId: string): Promise<{
    lecturesUploaded: number;
    selectionsCreated: number;
    itemsGenerated: number;
    examsCompleted: number;
  }> {
    const [
      lecturesUploaded,
      selectionsCreated,
      itemsGenerated,
      examsCompleted
    ] = await Promise.all([
      prisma.lecture.count(),  // 注意：这里需要根据实际业务逻辑调整
      prisma.selection.count({ where: { userId } }),
      prisma.item.count({
        where: {
          selection: { userId }
        }
      }),
      prisma.examAttempt.count({
        where: { 
          userId,
          submittedAt: { not: null }
        }
      })
    ]);

    return {
      lecturesUploaded,
      selectionsCreated,
      itemsGenerated,
      examsCompleted
    };
  }
}