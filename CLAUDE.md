# Study Assistant - Claude 开发指南

## 📋 文档使用指南

**本文件作用**: Claude AI 的开发和协作指南
**交流语言**: 中文为主（代码注释英文）

### 📖 何时查阅各文档

| 场景 | 文档位置 | 用途 |
|------|---------|------|
| 了解开发进度和下一步任务 | `docs/ROADMAP.md` | 查看阶段目标和任务看板 |
| 记录完成的功能和技术细节 | `docs/CHANGELOG.md` | 添加变更日志 |
| 理解系统架构和组件关系 | `docs/ARCHITECTURE.md` | 查看技术架构设计 |
| 配置运行环境和部署 | `docs/OPERATIONS.md` | 查看运行和维护指南 |
| 查看API接口规范和使用方法 | `docs/API.md` | 接口开发和前后端联调 |
| 了解开发规范和提交流程 | `docs/CONTRIBUTING.md` | 代码贡献和团队协作 |
| 项目简介和快速开始 | `README.md` | 面向新开发者的入门指南 |

### 🔄 更新文档的时机

1. **完成新功能后** → 更新 `docs/CHANGELOG.md`
2. **架构变更后** → 更新 `docs/ARCHITECTURE.md` 
3. **完成里程碑后** → 更新 `docs/ROADMAP.md`
4. **环境配置变更后** → 更新 `docs/OPERATIONS.md`
5. **API接口变更后** → 更新 `docs/API.md`
6. **开发流程调整后** → 更新 `docs/CONTRIBUTING.md`
7. **项目重大变化后** → 更新 `README.md`

### ⚠️ UI/UX 修改规范

**重要**: 在修改任何用户界面之前必须遵循以下流程：

1. **UI修改需要事先审核**
   - 任何UI/UX变更都必须先征得用户同意
   - 不得擅自修改已有的界面设计和用户体验
   - 包括但不限于：页面布局、样式、交互逻辑、组件结构

2. **保持现有UI完整性**
   - 除非明确要求，否则不修改现有UI组件
   - 特别是文件上传界面等核心功能的UI
   - 保持用户习惯的交互方式不变

3. **文档同步更新**
   - 每次代码修改后必须更新对应的文档
   - UI变更需要在CHANGELOG中详细记录
   - API变更需要更新API文档

### 📝 开发工作流

#### 开始新任务时
1. 查看 `docs/ROADMAP.md` 确认当前阶段目标
2. 检查 `docs/ARCHITECTURE.md` 了解相关组件
3. 参考 `docs/OPERATIONS.md` 配置开发环境

#### 完成任务后
1. 在 `docs/CHANGELOG.md` 记录详细变更
2. 更新 `docs/ROADMAP.md` 标记完成状态
3. 如有架构变更，更新 `docs/ARCHITECTURE.md`

## 🎯 项目概述

AI驱动的学习助手平台，将教育材料（PDF、PPT、TXT）转换为个性化学习内容和模拟考试。

### 核心特性
- 📄 智能文档处理和分段
- 🤖 基于AI的内容生成（翻译、总结、题目）
- 🔍 向量搜索和语义匹配
- 📝 个性化模拟考试
- 🔒 学术诚信保障

### 技术栈
- **前端**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **后端**: Fastify + Prisma + PostgreSQL + pgvector
- **认证**: NextAuth.js (凭证 + Google OAuth)
- **AI**: OpenAI API (GPT + Embeddings)
- **队列**: BullMQ + Redis
- **存储**: MinIO/S3

## 🚀 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 15+ (with pgvector)
- Redis 6+
- pnpm 8+

### 启动开发环境
```bash
# 克隆项目
git clone <repository>
cd study-assistant

# 安装依赖
pnpm install

# 配置环境变量
cp packages/db/.env.example packages/db/.env
# 编辑 .env 文件

# 启动数据库和外部服务
npm run docker:up

# 初始化数据库
npm run db:migrate
npm run db:seed

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 开始开发。

## 🔧 开发命令

```bash
# 开发
npm run dev              # 启动所有服务
npm run docker:up        # 启动外部依赖

# 数据库
npm run db:migrate       # 运行数据库迁移
npm run db:seed         # 初始化测试数据
npm run db:reset        # 重置数据库

# 测试
npm run test            # 单元测试
npm run test:e2e        # 端到端测试
npm run lint           # 代码检查
```

## 📞 支持和反馈

- 查看 [GitHub Issues](https://github.com/your-repo/issues) 
- 参考各 `docs/*.md` 文档获取详细信息
- 开发问题优先查阅 `docs/OPERATIONS.md`

---

**记住**: 始终保持文档同步，记录每个重要变更，便于团队协作和项目维护。