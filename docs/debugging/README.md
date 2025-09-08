# Bug调试文档索引

本目录包含项目中遇到的复杂bug调试记录，用于快速检索和避免重复修复。

## 📋 索引列表

### 文件上传相关
- [`bug-file-upload-validation-error.md`](./bug-file-upload-validation-error.md) - **✅ 已解决**
  - **问题**: 400错误，参数验证失败
  - **原因**: UUID vs CUID格式不匹配
  - **解决**: 修改验证schema为更宽松的字符串验证
  - **关键词**: file upload, validation, 400 error, UUID, CUID, Zod schema

## 🔍 快速搜索

使用以下命令快速搜索相关bug文档：

```bash
# 搜索文件上传相关问题
find docs/debugging/ -name "*.md" | xargs grep -l "upload"

# 搜索验证错误相关问题  
find docs/debugging/ -name "*.md" | xargs grep -l "validation"

# 搜索API相关问题
find docs/debugging/ -name "*.md" | xargs grep -l "API\|api"

# 搜索数据库相关问题
find docs/debugging/ -name "*.md" | xargs grep -l "database\|prisma"

# 搜索认证相关问题
find docs/debugging/ -name "*.md" | xargs grep -l "auth\|session"
```

## 📊 统计信息

- **总bug数**: 1
- **已解决**: 1 
- **解决率**: 100%
- **最后更新**: 2025-09-08

## 🏷️ 分类标签

| 分类 | 数量 | 状态 |
|------|------|------|
| 文件上传 | 1 | ✅ 已解决 |
| API验证 | 1 | ✅ 已解决 |
| 参数验证 | 1 | ✅ 已解决 |

## 📝 使用指南

1. **遇到新bug时**:
   - 首先在此索引中搜索关键词
   - 查看相关文档是否有类似问题
   - 参考解决方案和调试技巧

2. **添加新bug文档时**:
   - 使用格式: `bug-[功能名称]-[简短描述].md`
   - 在此README中添加索引条目
   - 更新统计信息和分类标签

3. **更新现有文档时**:
   - 修改bug状态（进行中/已解决）
   - 更新最后修改时间
   - 添加新的测试验证结果