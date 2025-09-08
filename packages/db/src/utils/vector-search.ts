/**
 * 向量搜索工具函数
 * 基于pgvector实现语义相似度搜索
 */

import { prisma } from '../index';
import type { Segment } from '@prisma/client';

/**
 * 向量搜索结果接口
 */
export interface VectorSearchResult {
  segment: Segment;
  similarity: number;  // 相似度分数(0-1)
}

/**
 * 搜索过滤器
 */
export interface SearchFilters {
  lectureIds?: string[];      // 限制在特定讲义内搜索
  courseId?: string;          // 限制在特定课程内搜索
  excludeSegmentIds?: string[]; // 排除特定片段
  minSimilarity?: number;     // 最小相似度阈值
}

/**
 * 向量搜索工具类
 */
export class VectorSearch {
  /**
   * 执行相似度搜索
   * @param queryEmbedding 查询向量 (1536维)
   * @param options 搜索选项
   * @returns 相似片段列表
   */
  static async findSimilar(
    queryEmbedding: number[],
    options: {
      limit?: number;
      filters?: SearchFilters;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, filters = {} } = options;
    const { 
      lectureIds, 
      courseId, 
      excludeSegmentIds, 
      minSimilarity = 0.7 
    } = filters;

    // 构建WHERE条件
    const whereConditions: string[] = [];
    const queryParams: any[] = [JSON.stringify(queryEmbedding), limit];

    // 讲义过滤
    if (lectureIds && lectureIds.length > 0) {
      whereConditions.push(`lecture_id = ANY($${queryParams.length + 1})`);
      queryParams.push(lectureIds);
    }

    // 课程过滤(需要JOIN)
    let joinClause = '';
    if (courseId) {
      joinClause = 'JOIN lectures l ON segments.lecture_id = l.id';
      whereConditions.push(`l.course_id = $${queryParams.length + 1}`);
      queryParams.push(courseId);
    }

    // 排除特定片段
    if (excludeSegmentIds && excludeSegmentIds.length > 0) {
      whereConditions.push(`segments.id != ALL($${queryParams.length + 1})`);
      queryParams.push(excludeSegmentIds);
    }

    // 相似度阈值过滤
    const similarityCondition = `1 - (embedding <=> $1::vector) >= ${minSimilarity}`;
    whereConditions.push(similarityCondition);

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 执行原生SQL查询(pgvector余弦相似度)
    const query = `
      SELECT 
        segments.id,
        segments.lecture_id,
        segments.text,
        segments.token_count,
        segments.page,
        segments.slide,
        segments.char_start,
        segments.char_end,
        segments.bbox,
        segments.hash,
        segments.created_at,
        1 - (embedding <=> $1::vector) as similarity
      FROM segments
      ${joinClause}
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;

    const results = await prisma.$queryRawUnsafe<Array<Segment & { similarity: number }>>(
      query,
      ...queryParams
    );

    return results.map(row => ({
      segment: {
        id: row.id,
        lectureId: row.lecture_id,
        text: row.text,
        tokenCount: row.token_count,
        page: row.page,
        slide: row.slide,
        charStart: row.char_start,
        charEnd: row.char_end,
        bbox: row.bbox,
        hash: row.hash,
        createdAt: row.created_at,
        embedding: null // 不返回向量数据以节省带宽
      },
      similarity: Number(row.similarity)
    }));
  }

  /**
   * 批量更新向量嵌入
   * @param embeddings 片段ID和对应的向量数组
   */
  static async updateEmbeddings(
    embeddings: Array<{
      segmentId: string;
      embedding: number[];
    }>
  ): Promise<void> {
    // 使用事务批量更新
    await prisma.$transaction(
      embeddings.map(({ segmentId, embedding }) =>
        prisma.$executeRaw`
          UPDATE segments 
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${segmentId}
        `
      )
    );
  }

  /**
   * 创建向量索引(生产环境使用)
   * 注意：这个操作比较耗时，建议在数据导入完成后执行
   */
  static async createVectorIndex(): Promise<void> {
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS segments_embedding_idx 
      ON segments USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100)
    `;
  }

  /**
   * 优化向量搜索性能
   * 创建复合索引以支持过滤查询
   */
  static async createOptimizedIndexes(): Promise<void> {
    // 讲义+向量复合索引
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS segments_lecture_embedding_idx 
      ON segments (lecture_id) INCLUDE (embedding)
    `;

    // 课程范围搜索支持
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS lectures_course_idx
      ON lectures (course_id)
    `;
  }

  /**
   * 获取向量搜索统计信息
   */
  static async getSearchStats(): Promise<{
    totalVectors: number;
    nullVectors: number;
    avgTextLength: number;
  }> {
    const stats = await prisma.$queryRaw<Array<{
      total_vectors: bigint;
      null_vectors: bigint; 
      avg_text_length: number;
    }>>`
      SELECT 
        COUNT(*) as total_vectors,
        COUNT(*) - COUNT(embedding) as null_vectors,
        AVG(LENGTH(text)) as avg_text_length
      FROM segments
    `;

    const stat = stats[0];
    return {
      totalVectors: Number(stat.total_vectors),
      nullVectors: Number(stat.null_vectors),
      avgTextLength: Math.round(stat.avg_text_length || 0)
    };
  }

  /**
   * 清理无效向量(开发调试用)
   */
  static async cleanupInvalidVectors(): Promise<number> {
    const result = await prisma.$executeRaw`
      DELETE FROM segments 
      WHERE embedding IS NULL 
      OR array_length(embedding::float[], 1) != 1536
    `;
    return Number(result);
  }
}