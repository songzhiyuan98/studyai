# 🤝 贡献指南

## 📋 开发流程

### 1. 开发环境设置
```bash
# 克隆项目
git clone <repository>
cd study-assistant

# 安装依赖
pnpm install

# 启动开发环境
npm run docker:up
npm run db:migrate
npm run db:seed
npm run dev
```

### 2. 分支管理
- **main**: 主分支，生产环境代码
- **develop**: 开发分支，功能集成
- **feature/***: 功能分支，命名格式: `feature/功能描述`
- **fix/***: 修复分支，命名格式: `fix/问题描述`

### 3. 提交规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
```
<类型>[可选范围]: <描述>

[可选的正文]

[可选的脚注]
```

**类型说明**:
- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建或辅助工具的变动

**示例**:
```
feat(upload): 添加拖拽上传功能

实现了文档的拖拽上传界面，支持 PDF、PPTX、TXT 格式

Closes #123
```

### 4. 代码规范

#### TypeScript 规范
- 使用严格类型检查
- 避免 `any` 类型，优先使用具体类型或泛型
- 导出的函数和组件必须有类型声明
- 使用一致的命名约定

#### React 组件规范
```typescript
// 组件文件结构
interface ComponentProps {
  // props 类型定义
}

export default function ComponentName({ prop1, prop2 }: ComponentProps) {
  // hooks
  // handlers
  // render
  return (
    // JSX
  )
}
```

#### 文件命名约定
- **React 组件**: PascalCase (`UserProfile.tsx`)
- **页面文件**: kebab-case (`user-profile.tsx`)
- **工具函数**: camelCase (`formatDate.ts`)
- **常量文件**: SCREAMING_SNAKE_CASE (`API_ROUTES.ts`)

### 5. 测试要求
- 新功能必须包含单元测试
- 关键业务逻辑需要集成测试
- UI 组件需要视觉回归测试

### 6. Pull Request 流程

#### 提交 PR 前检查
- [ ] 代码通过所有测试 (`npm run test`)
- [ ] 代码通过 lint 检查 (`npm run lint`)
- [ ] 类型检查无错误 (`npm run type-check`)
- [ ] 更新相关文档
- [ ] 添加或更新测试

#### PR 模板
```markdown
## 变更类型
- [ ] 新功能
- [ ] 修复问题
- [ ] 重构代码
- [ ] 文档更新

## 变更描述
简要描述此次变更的内容和原因。

## 相关 Issue
Closes #issue_number

## 测试
描述如何测试这些变更。

## 截图 (如适用)
添加相关截图或 GIF。
```

### 7. 发布流程
1. 合并到 `develop` 分支
2. 运行完整测试套件
3. 更新版本号和 CHANGELOG
4. 创建发布 PR 到 `main`
5. 部署到生产环境

### 8. 问题报告
使用 GitHub Issues 报告问题，包含：
- 问题描述
- 重现步骤
- 预期行为
- 实际行为
- 环境信息
- 相关截图或日志

### 9. 代码审查标准
- 功能正确性
- 性能影响
- 安全考虑
- 代码可读性
- 测试覆盖率

## 📞 获取帮助
- 查阅 `docs/` 目录下的技术文档
- 在 GitHub Discussions 中提问
- 联系项目维护者

---

感谢你的贡献！🚀