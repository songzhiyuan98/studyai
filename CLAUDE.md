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

### 🔄 自动化GitHub推送审核流程

**重要**: 每次完成重要功能更新后，必须遵循以下审核流程：

#### 📋 触发自动审核的情况
以下任何一种情况完成后，Claude必须主动请求用户审核并推送到GitHub：

1. **新功能完成** - 实现了新的业务功能或用户界面
2. **重要bug修复** - 修复了影响用户体验的关键问题
3. **架构重构** - 对系统架构进行了重要调整
4. **API变更** - 新增或修改了API接口
5. **UI/UX优化** - 完成了界面设计改进
6. **配置更新** - 重要的环境配置或部署配置变更
7. **文档重大更新** - 完成了重要的文档更新

### 🐛 复杂Bug处理规范

**重要**: 对于超过三次尝试仍未解决的复杂bug，必须建立专门的调试文档：

#### 📋 Bug调试文档要求

1. **创建调试文档**
   - 在 `docs/debugging/` 目录下创建专门的bug调试文档
   - 文件命名格式: `bug-[功能名称]-[简短描述].md`
   - 例如: `bug-file-upload-validation-error.md`

2. **文档内容结构**
   ```markdown
   # Bug调试记录: [Bug标题]
   
   ## 📋 问题概述
   - **发现时间**: 
   - **影响范围**: 
   - **错误表现**: 
   - **复现步骤**: 
   
   ## 🔍 调试过程
   ### 尝试 1: [日期]
   - **假设**: 
   - **测试方法**: 
   - **结果**: 
   - **结论**: 
   
   ### 尝试 2: [日期]
   - **假设**: 
   - **测试方法**: 
   - **结果**: 
   - **结论**: 
   
   ## ✅ 最终解决方案
   - **根本原因**: 
   - **解决方法**: 
   - **验证步骤**: 
   
   ## 📚 经验总结
   - **预防措施**: 
   - **相关知识点**: 
   ```

3. **API测试要求**
   - 每个API端点在上线前必须通过本地测试
   - 使用curl或Postman进行直接测试
   - 验证所有可能的输入参数和边界情况
   - 确认错误处理和日志记录正常工作

4. **Bug历史检查规范** ⚠️ **强制执行**
   
   在开始调试任何bug之前，必须按照以下顺序检查：
   
   a) **检查现有调试文档**
   ```bash
   # 搜索相关bug调试文档
   find docs/debugging/ -name "*.md" | grep -i [关键词]
   ```
   
   b) **分析历史修复记录**
   - 查看 `docs/debugging/` 目录下相关文档
   - 确认该bug是否已有解决方案
   - 检查修复方法是否适用于当前情况
   
   c) **避免重复修复**
   - 如果发现相同问题已修复，直接应用解决方案
   - 如果解决方案不适用，在原文档基础上扩展
   - 记录新的变体情况和解决方法
   
   d) **更新文档状态**
   - 成功修复后，更新文档状态为"✅ 完全解决"
   - 添加成功验证的测试结果和日志
   - 记录测试覆盖范围确保完整性
   
   e) **同步更新相关文档** ⚠️ **强制执行**
   - **API文档更新** (`docs/API.md`)
     - 如果修复涉及API端点，必须更新API文档
     - 添加或修改端点描述、参数说明、响应格式
     - 更新错误码和错误处理说明
   - **架构文档更新** (`docs/ARCHITECTURE.md`)
     - 如果修复改变了系统架构或组件关系
     - 更新相关的架构图和组件说明
   - **操作文档更新** (`docs/OPERATIONS.md`)
     - 如果修复涉及环境配置、部署或运维
     - 更新配置说明、故障排除步骤
   - **变更日志更新** (`docs/CHANGELOG.md`)
     - 记录Bug修复的详细信息
     - 包含修复前后的行为对比
     - 标注影响范围和破坏性变更

5. **引用调试文档**
   - 遇到类似bug时，优先参考已有的调试文档
   - 根据历史经验快速定位问题
   - 避免重复相同的调试步骤

#### 🤖 Claude自动化审核请求

当满足上述条件时，Claude必须：

1. **主动总结更改**
   ```
   📋 功能更新完成！准备推送到GitHub
   
   🔄 本次更改：
   - [具体描述完成的功能]
   - [修改的文件列表]
   - [测试状态和结果]
   
   📝 提交信息：
   [提议的git commit message]
   
   📋 是否批准推送到GitHub？
   - ✅ 批准 - 立即推送
   - 🔄 修改 - 需要调整后再推送  
   - ❌ 拒绝 - 暂不推送
   ```

2. **等待用户确认**
   - 用户回复"批准"、"✅"或"推送"时执行推送
   - 用户提出修改意见时先完善代码再重新请求审核
   - 用户拒绝时停止推送流程

3. **执行推送流程**
   ```bash
   git add .
   git commit -m "[用户确认的提交信息]

   🚀 Generated with Claude Code
   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push origin main
   ```

4. **更新文档**
   - 同步更新 `docs/CHANGELOG.md`
   - 必要时更新相关技术文档

#### ⚡ 自动化规则

- **强制执行**: 完成重要功能后，Claude必须主动请求审核，不得跳过此流程
- **详细描述**: 必须清晰说明本次更改的内容和影响
- **测试确认**: 推送前确认功能正常工作
- **文档同步**: 推送的同时必须更新相关文档

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