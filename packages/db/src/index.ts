/**
 * 数据库访问层 - Prisma客户端导出
 * 提供类型安全的数据库操作接口
 */

import { PrismaClient } from '@prisma/client';

// 全局Prisma客户端实例(开发环境避免热重载重复连接)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 创建Prisma客户端实例
export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['query'], // 开发环境下记录查询日志
  });

// 开发环境下保存到全局变量
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 导出Prisma类型以供其他包使用
export * from '@prisma/client';

// 导出常用的数据库操作工具函数
export * from './utils/queries';
export * from './utils/vector-search';
export * from './utils/migrations';