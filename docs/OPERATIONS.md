# 🔧 运维操作指南

## 🚀 本地开发环境

### 环境要求
```bash
# 必需软件版本
Node.js >= 18.0.0
pnpm >= 8.0.0
PostgreSQL >= 15.0 (with pgvector extension)
Redis >= 6.0
Docker >= 20.10 (可选，用于外部服务)
```

### 快速启动
```bash
# 1. 克隆项目
git clone <repository>
cd study-assistant

# 2. 安装依赖
pnpm install

# 3. 启动外部服务 (PostgreSQL + Redis + MinIO)
npm run docker:up

# 4. 配置环境变量
cp packages/db/.env.example packages/db/.env
# 编辑 .env 文件配置数据库连接

# 5. 初始化数据库
npm run db:migrate
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

### 开发服务器端口
- **Web前端**: http://localhost:3000
- **API服务**: http://localhost:4000  
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MinIO**: http://localhost:9000

## 🔧 环境变量配置

### 必需的环境变量
```bash
# packages/db/.env
# =================

# 基础环境
NODE_ENV=development
PORT=3000
API_PORT=4000

# 数据库配置
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/study_assistant"

# Redis配置
REDIS_URL="redis://localhost:6379"

# 文件存储 (MinIO)
STORAGE_TYPE=minio
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_NAME=study-assistant
MINIO_USE_SSL=false

# AI服务配置 (必须配置真实API Key)
OPENAI_API_KEY=sk-proj-你的OpenAI-API-Key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_CHAT=gpt-3.5-turbo
OPENAI_MODEL_EMBEDDING=text-embedding-3-small

# NextAuth.js认证
NEXTAUTH_SECRET=dev-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=dev-jwt-secret-key

# Google OAuth (可选)
GOOGLE_CLIENT_ID=你的Google-Client-ID
GOOGLE_CLIENT_SECRET=你的Google-Client-Secret
```

### 生产环境额外配置
```bash
# 生产环境特有
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com

# 安全配置
NEXTAUTH_SECRET=生产环境随机密钥
JWT_SECRET=生产环境JWT密钥

# 数据库 (推荐云服务)
DATABASE_URL="postgresql://user:pass@prod-db.com:5432/study_assistant?sslmode=require"

# 文件存储 (AWS S3)
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=你的AWS访问密钥
AWS_SECRET_ACCESS_KEY=你的AWS秘密密钥
AWS_REGION=us-west-2
AWS_BUCKET_NAME=study-assistant-prod
```

## 📊 数据库管理

### 常用数据库命令
```bash
# 数据库迁移
npm run db:generate       # 生成Prisma客户端
npm run db:migrate        # 运行迁移
npm run db:reset         # 重置数据库(危险!)
npm run db:seed          # 初始化测试数据

# 数据库状态检查
npm run db:status        # 查看迁移状态
npm run db:studio        # 打开Prisma Studio
```

### 数据库维护
```bash
# 备份数据库
pg_dump -h localhost -U postgres study_assistant > backup.sql

# 恢复数据库  
psql -h localhost -U postgres study_assistant < backup.sql

# 查看数据库大小
psql -h localhost -U postgres -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### pgvector 维护
```bash
# 重建向量索引 (性能优化)
psql -h localhost -U postgres study_assistant -c "
  REINDEX INDEX segments_embedding_cosine_idx;
"

# 查看索引使用情况
psql -h localhost -U postgres study_assistant -c "
  SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE indexname LIKE '%embedding%';
"

# 向量搜索性能测试
psql -h localhost -U postgres study_assistant -c "
  EXPLAIN ANALYZE 
  SELECT id, content, embedding <=> '[0,1,0...]' as distance
  FROM segments 
  ORDER BY embedding <=> '[0,1,0...]' 
  LIMIT 10;
"
```

## 🐳 Docker 部署

### 本地Docker开发
```bash
# 构建所有服务
docker-compose -f docker-compose.dev.yml build

# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f web

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 生产Docker部署
```bash
# 构建生产镜像
docker build -t study-assistant:latest .

# 运行生产容器
docker run -d \
  --name study-assistant \
  -p 3000:3000 \
  -e DATABASE_URL="your-prod-db-url" \
  -e OPENAI_API_KEY="your-api-key" \
  study-assistant:latest
```

## ☁️ 云端部署

### Vercel 部署 (推荐前端)
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 配置环境变量 (在Vercel Dashboard)
NEXTAUTH_SECRET=生产密钥
DATABASE_URL=数据库连接串
OPENAI_API_KEY=OpenAI密钥
```

### AWS/Railway 部署 (后端服务)
```bash
# 构建应用
npm run build

# 设置环境变量
export NODE_ENV=production
export DATABASE_URL="生产数据库URL"
export REDIS_URL="生产Redis URL"

# 启动生产服务
npm start
```

## 📊 监控和日志

### 健康检查端点
```bash
# API健康检查
curl http://localhost:4000/health

# 数据库连接检查  
curl http://localhost:4000/health/db

# Redis连接检查
curl http://localhost:4000/health/redis
```

### 日志收集
```bash
# 应用日志
pm2 logs study-assistant

# 数据库日志
tail -f /var/log/postgresql/postgresql-15-main.log

# Nginx访问日志
tail -f /var/log/nginx/access.log
```

### 性能监控
```bash
# CPU和内存使用
htop

# 数据库连接数
psql -h localhost -U postgres -c "
  SELECT count(*) as connections, state 
  FROM pg_stat_activity 
  WHERE datname = 'study_assistant' 
  GROUP BY state;
"

# Redis内存使用
redis-cli info memory
```

## 🔄 备份和恢复

### 自动备份脚本
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/var/backups/study-assistant"
DATE=$(date +%Y%m%d_%H%M%S)

# 数据库备份
pg_dump -h localhost -U postgres study_assistant > \
  $BACKUP_DIR/db_backup_$DATE.sql

# 文件备份 (MinIO/S3)
aws s3 sync s3://study-assistant-bucket \
  $BACKUP_DIR/files_$DATE/

# 清理旧备份 (保留7天)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "files_*" -mtime +7 -exec rm -rf {} \;
```

### 恢复流程
```bash
# 1. 停止应用服务
pm2 stop study-assistant

# 2. 恢复数据库
psql -h localhost -U postgres study_assistant < backup.sql

# 3. 恢复文件
aws s3 sync backup/files/ s3://study-assistant-bucket/

# 4. 重启服务
pm2 restart study-assistant
```

## 🚨 故障排除

### 常见问题和解决方案

#### 1. 数据库连接失败
```bash
# 检查PostgreSQL状态
systemctl status postgresql

# 检查连接配置
psql -h localhost -U postgres study_assistant

# 检查pgvector扩展
psql -h localhost -U postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

#### 2. NextAuth认证问题
```bash
# 检查环境变量
echo $NEXTAUTH_SECRET
echo $NEXTAUTH_URL

# 检查数据库表
psql -h localhost -U postgres study_assistant -c "
  SELECT tablename FROM pg_tables 
  WHERE tablename IN ('accounts', 'sessions', 'users');
"
```

#### 3. 文件上传失败
```bash
# 检查MinIO状态
curl http://localhost:9000/minio/health/live

# 检查存储空间
df -h

# 检查文件权限
ls -la uploads/
```

#### 4. AI API调用失败
```bash
# 测试OpenAI连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# 检查API配额
# 登录 https://platform.openai.com/account/usage
```

### 性能优化
```bash
# 数据库查询优化
npm run db:analyze

# 清理缓存
redis-cli FLUSHALL

# 重启应用释放内存
pm2 restart study-assistant
```

---

**📝 更新说明**: 运维文档随部署环境变化更新，重要配置变更需要通知所有开发者。
