-- 数据库初始化SQL脚本
-- 在PostgreSQL容器启动时自动执行

-- 启用必需的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID生成
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector向量搜索

-- 创建应用专用用户(生产环境使用)
-- CREATE USER study_assistant_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE study_assistant TO study_assistant_user;

-- 设置数据库配置优化
ALTER SYSTEM SET shared_preload_libraries = 'vector';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- 重新加载配置
SELECT pg_reload_conf();

-- 输出初始化完成信息
\echo '✅ 数据库初始化完成'
\echo '📊 已启用扩展: uuid-ossp, vector'
\echo '⚙️ 性能参数已优化'