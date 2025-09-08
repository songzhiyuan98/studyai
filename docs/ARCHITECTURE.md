# 🏗️ 系统架构设计

## 📋 架构概览

Study Assistant 采用现代微服务架构，支持AI驱动的文档处理和学习内容生成。

```
用户 --> Web前端 --> API服务 --> 数据库
                        |
                     队列系统 --> 后台工作器
                        |
                     存储服务 --> AI服务
```

## 🔄 数据流设计

### 1. 文档上传和处理流程
1. 用户上传文档 → Web前端
2. 前端调用 API → 存储文件到MinIO/S3
3. API创建数据库记录 → 排队处理任务
4. 后台工作器处理 → 解析分段 → 生成向量嵌入
5. 存储结果到数据库 → 更新处理状态

### 2. 内容生成和学习流程
1. 用户选择文档段落 → 创建选择记录
2. 请求生成内容 → 排队AI任务
3. 调用OpenAI API → 生成学习内容
4. 存储结果 → 推送完成通知

## 🗄️ 数据模型设计

### 核心实体关系
```
USER (用户)
├── FOLDER (文件夹)
│   └── LECTURE (讲义)
│       └── SEGMENT (段落)
├── SELECTION (选择)
│   └── ITEM (生成内容)
└── EXAM (考试)
    └── EXAM_ATTEMPT (考试记录)
```

### 关键字段设计
- **用户表**: id, email, name, password(可选), role
- **文件夹表**: id, name, description, userId
- **讲义表**: id, folderId, title, fileUrl, type, status
- **段落表**: id, lectureId, content, embedding(向量), page
- **选择表**: id, userId, lectureId, segmentIds[]
- **内容表**: id, selectionId, type, payloadJson, sourceRefs

## 🔧 组件边界定义

### 前端组件架构
```
app/web/src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面
│   ├── dashboard/         # 主控制台
│   ├── upload/           # 文档上传
│   ├── library/          # 文档库
│   └── api/              # API路由
├── components/           # 可复用组件
│   ├── ui/              # 基础UI组件
│   ├── forms/           # 表单组件
│   └── layout/          # 布局组件
├── lib/                 # 工具库
└── providers/          # React Context
```

### 后端服务架构
```
app/
├── api/                 # API服务器 (Fastify)
│   ├── routes/         # 路由定义
│   ├── plugins/        # Fastify插件
│   └── middleware/     # 中间件
├── workers/            # 后台工作器 (BullMQ)
│   ├── ingest/        # 文档处理
│   ├── generate/      # AI内容生成
│   └── export/        # 导出服务
└── sidecar/           # Python OCR服务
```

## 🔍 向量检索链路

### 语义搜索流程
1. **查询处理**: 用户输入 → 文本嵌入 (OpenAI ada-002)
2. **向量搜索**: pgvector数据库 → ivfflat索引查询
3. **结果排序**: 余弦相似度计算 → Top-K结果
4. **后处理**: 去重过滤 → 权限检查 → 返回结果

### 搜索优化策略
- **索引类型**: IVFFlat (Inverted File with Flat)
- **距离函数**: 余弦相似度 (Cosine Distance)
- **向量维度**: 1536 (OpenAI ada-002)
- **检索阈值**: 0.8+ 相似度
- **结果限制**: Top-10 相关段落

## 🔒 权限和审计设计

### 基于角色的访问控制 (RBAC)
```
ADMIN (管理员)
├── 系统管理
├── 用户管理
└── 审计日志

INSTRUCTOR (教师)
├── 课程内容管理
└── 学生进度查看

STUDENT (学生)
├── 个人文档访问
└── 学习内容生成
```

### 审计日志策略
- **操作记录**: 所有CRUD操作和AI调用
- **数据保留**: 6个月活跃 + 2年归档
- **合规报告**: 学术诚信检查报告
- **隐私保护**: 个人数据访问日志

## 🚀 异步处理队列

### BullMQ 任务类型
- **document:ingest** - 文档摄取处理
- **content:generate** - AI内容生成
- **export:data** - 数据导出
- **cleanup:files** - 文件清理
- **vector:index** - 向量索引更新

### 队列优先级和并发
- **高优先级**: 用户交互任务 (内容生成)
- **中优先级**: 文档处理任务
- **低优先级**: 清理和维护任务
- **并发控制**: 每种任务类型独立限制

## 📈 性能监控指标

### 关键性能指标 (KPI)
- **响应时间**: API < 200ms, 页面加载 < 3s
- **处理速度**: 文档摄取 < 30s/文档
- **AI调用**: GPT响应 < 5s, 嵌入生成 < 2s
- **并发能力**: 100+ 同时用户
- **可用性**: 99.9% SLA

### 监控技术栈
- **指标收集**: OpenTelemetry
- **时序数据**: Prometheus  
- **可视化**: Grafana
- **日志聚合**: ELK Stack
- **告警**: PagerDuty

## 🔗 服务间通信

### API设计原则
- **RESTful**: 标准HTTP动词和状态码
- **版本控制**: URL路径版本 (/api/v1/)
- **响应格式**: 统一JSON结构
- **错误处理**: 标准错误码和消息
- **认证**: JWT Bearer Token

### 关键API端点
```
# 认证相关
POST /api/auth/register     # 用户注册
POST /api/auth/login        # 用户登录
GET  /api/auth/session      # 获取会话

# 文档管理
POST /api/lectures          # 上传文档
GET  /api/lectures/:id      # 获取文档详情
GET  /api/folders           # 获取文件夹列表

# 内容生成
POST /api/selections        # 创建内容选择
POST /api/items/generate    # 生成学习内容
GET  /api/items/:id         # 获取生成结果
```

---

**📝 更新说明**: 架构随系统演进持续更新，重大变更需要团队评审。