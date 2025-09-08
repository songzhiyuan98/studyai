# 📚 Study Assistant - AI学习助手

> AI驱动的智能学习平台，将教育材料转换为个性化学习内容和模拟考试

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## ✨ 核心特性

### 📄 智能文档处理
- 支持 PDF、PPT、TXT 多种格式
- 自动文档分段和内容提取
- OCR 扫描文档识别
- 表格和公式智能解析

### 🤖 AI内容生成
- 基于选定内容的智能翻译
- 自动生成学习总结
- 个性化术语表和闪卡
- 上下文相关的知识扩展

### 🔍 向量语义搜索
- pgvector 支持的语义搜索
- 相关知识自动关联
- 跨文档内容发现
- 个性化推荐系统

### 📝 模拟考试系统
- 基于学习内容的题目生成
- 多种题型支持 (选择、填空、简答)
- 自动评分和详细反馈
- 学习进度跟踪分析

### 🔒 学术诚信保障
- 完整的内容来源追踪
- 学术诚信检查机制
- 审计日志和合规报告
- 权限管理和访问控制

## 🚀 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 15+ (with pgvector)
- Redis 6+
- pnpm 8+

### 1. 安装项目
```bash
# 克隆仓库
git clone https://github.com/your-username/study-assistant.git
cd study-assistant

# 安装依赖
pnpm install
```

### 2. 配置环境
```bash
# 复制环境变量模板
cp packages/db/.env.example packages/db/.env

# 编辑配置文件
nano packages/db/.env
```

必需配置：
- `DATABASE_URL`: PostgreSQL 连接字符串
- `OPENAI_API_KEY`: OpenAI API 密钥
- `NEXTAUTH_SECRET`: NextAuth.js 密钥

### 3. 初始化数据库
```bash
# 启动外部服务 (PostgreSQL, Redis, MinIO)
npm run docker:up

# 运行数据库迁移
npm run db:migrate

# 初始化测试数据
npm run db:seed
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 开始使用！

## 📖 使用指南

### 基础工作流程

1. **注册账户** - 使用邮箱或 Google 账户注册
2. **创建文件夹** - 按课程或主题组织文档
3. **上传文档** - 支持 PDF、PPT、TXT 格式
4. **选择内容** - 在文档中选择需要学习的段落
5. **生成内容** - AI 自动生成翻译、总结、题目
6. **模拟考试** - 基于学习内容创建个性化考试
7. **跟踪进度** - 查看学习统计和改进建议

### 支持的功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 📁 文件夹管理 | ✅ 已完成 | 多层级文档组织 |
| 🔐 用户认证 | ✅ 已完成 | 邮箱/Google OAuth |
| 📄 PDF处理 | 🚧 开发中 | 文本提取和分段 |
| 🤖 AI翻译 | ⏳ 计划中 | 多语言翻译支持 |
| 📝 考试系统 | ⏳ 计划中 | 自动题目生成 |

## 🛠️ 技术架构

### 前端
- **框架**: Next.js 14 + React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand + React Query
- **认证**: NextAuth.js

### 后端
- **API服务**: Fastify
- **数据库**: PostgreSQL + pgvector
- **ORM**: Prisma
- **队列**: BullMQ + Redis
- **存储**: MinIO/S3

### AI服务
- **模型**: OpenAI GPT-3.5/4
- **嵌入**: text-embedding-ada-002
- **向量搜索**: pgvector + ivfflat

## 📋 开发指南

### 项目结构
```
study-assistant/
├── app/                    # 应用服务
│   ├── web/               # Next.js 前端
│   ├── api/               # Fastify API
│   └── workers/           # 后台工作器
├── packages/              # 共享包
│   ├── db/                # 数据库和Prisma
│   ├── shared/            # 共享工具
│   └── ui/                # UI组件库
├── docs/                  # 文档
│   ├── ROADMAP.md         # 开发路线图
│   ├── ARCHITECTURE.md    # 系统架构
│   └── OPERATIONS.md      # 运维指南
└── CLAUDE.md              # Claude AI协作指南
```

### 常用命令
```bash
# 开发
npm run dev              # 启动开发环境
npm run build            # 构建生产版本
npm run test             # 运行测试

# 数据库
npm run db:migrate       # 数据库迁移
npm run db:seed         # 初始化数据
npm run db:studio       # Prisma Studio

# 代码质量
npm run lint            # 代码检查
npm run type-check      # 类型检查
npm run format          # 代码格式化
```

### 参与贡献
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📚 文档资源

- 📋 [开发路线图](docs/ROADMAP.md) - 功能规划和进度
- 🏗️ [系统架构](docs/ARCHITECTURE.md) - 技术架构设计
- 🔧 [运维指南](docs/OPERATIONS.md) - 部署和维护
- 🔌 [API 接口文档](docs/API.md) - 接口规范和使用说明
- 🤝 [贡献指南](docs/CONTRIBUTING.md) - 开发规范和流程
- 📝 [变更日志](docs/CHANGELOG.md) - 详细开发记录
- 🤖 [Claude协作](CLAUDE.md) - AI协作指南

## 🤝 社区支持

- 💬 [GitHub Discussions](https://github.com/your-repo/discussions) - 讨论和问答
- 🐛 [Issues](https://github.com/your-repo/issues) - 问题反馈
- 📧 [邮件联系](mailto:support@study-assistant.com) - 直接联系

## 📜 许可证

本项目采用 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

感谢以下开源项目：
- [Next.js](https://nextjs.org/) - React 框架
- [Prisma](https://www.prisma.io/) - 数据库工具
- [pgvector](https://github.com/pgvector/pgvector) - 向量数据库扩展
- [OpenAI](https://openai.com/) - AI API服务

---

**⭐ 如果这个项目对你有帮助，请给我们一个星标支持！**