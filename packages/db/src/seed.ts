/**
 * 数据库种子脚本
 * 用于初始化开发环境的测试数据
 */

import { DatabaseMigrations } from './utils/migrations';

async function main() {
  console.log('🚀 开始数据库初始化...');

  try {
    // 1. 健康检查
    console.log('\n📋 执行健康检查...');
    const health = await DatabaseMigrations.healthCheck();
    
    if (!health.connected) {
      throw new Error('数据库连接失败');
    }
    console.log('✅ 数据库连接正常');

    if (!health.vectorExtension) {
      console.log('⚠️  pgvector扩展未启用，正在启用...');
      await DatabaseMigrations.enableVectorExtension();
    } else {
      console.log('✅ pgvector扩展已启用');
    }

    // 2. 创建索引
    if (!health.indexesExist) {
      console.log('\n🔍 创建向量搜索索引...');
      await DatabaseMigrations.createVectorIndexes();
    } else {
      console.log('✅ 向量索引已存在');
    }

    // 3. 在开发环境创建测试数据
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🌱 创建测试数据...');
      
      // 可选：清理旧数据
      const shouldReset = process.argv.includes('--reset');
      if (shouldReset) {
        await DatabaseMigrations.resetDevelopmentData();
      }

      await DatabaseMigrations.seedTestData();
    }

    console.log('\n🎉 数据库初始化完成！');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 执行脚本
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });