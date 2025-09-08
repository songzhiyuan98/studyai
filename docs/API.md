# 🔌 API 接口文档

## 📋 接口概览

Study Assistant 提供 RESTful API 用于所有前后端通信。

### 🔗 Base URL
- **开发环境**: `http://localhost:3000/api` 
- **生产环境**: `https://api.study-assistant.com`

### 🔐 认证方式
接口使用 NextAuth.js 会话认证，支持：
- **Cookie认证**: 浏览器自动处理会话cookie
- **JWT Token**: 可选择性使用Bearer token

```http
# Cookie会话认证（推荐）
Cookie: next-auth.session-token=<session-token>

# 或者JWT Token认证
Authorization: Bearer <jwt_token>
```

## 🔒 认证接口

### 用户注册
```http
POST /auth/register
```

**请求体**:
```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "securePassword123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "张三",
      "email": "zhangsan@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录
```http
POST /auth/login
```

**请求体**:
```json
{
  "email": "zhangsan@example.com",
  "password": "securePassword123"
}
```

### 获取当前用户信息
```http
GET /auth/me
Authorization: Bearer <token>
```

## 📁 文件夹管理接口

### 获取文件夹列表
```http
GET /folders
Cookie: next-auth.session-token=<session-token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmfb03tqk00032oz4h02jjbx6",
      "name": "计算机网络",
      "description": "网络相关课程材料",
      "_count": {
        "lectures": 5
      },
      "createdAt": "2025-09-08T10:00:00Z",
      "updatedAt": "2025-09-08T12:00:00Z"
    }
  ]
}
```

### 创建文件夹
```http
POST /folders
Cookie: next-auth.session-token=<session-token>
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "数据库系统",
  "description": "数据库课程资料"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "cmfb03tqk00072oz4h02jjbx7",
    "name": "数据库系统",
    "description": "数据库课程资料",
    "userId": "cmfarp89g0003q2ynzbb653ob",
    "createdAt": "2025-09-08T13:00:00Z",
    "updatedAt": "2025-09-08T13:00:00Z"
  }
}
```

## 📄 文档管理接口

### 上传文档
```http
POST /lectures
Content-Type: multipart/form-data
Cookie: next-auth.session-token=<session-token>
```

**表单数据**:
- `file`: 上传的文件 (PDF/PPTX/TXT，最大100MB)
- `folderId`: 目标文件夹ID (CUID格式，如: cmfb03tqk00032oz4h02jjbx6)
- `title`: 文档标题 (可选，未提供时使用文件名)

**文件类型支持**:
- **PDF**: `application/pdf`
- **PPTX**: `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **TXT**: `text/plain`

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "id": "cmfb03tqk00042oz4h02jjbx8",
    "title": "第一章：网络基础.pdf",
    "originalName": "第一章：网络基础.pdf",
    "type": "PDF",
    "status": "UPLOADED",
    "fileKey": "lectures/2025/09/08/cmfb03tqk00042oz4h02jjbx8.pdf",
    "size": 2048576,
    "folderId": "cmfb03tqk00032oz4h02jjbx6",
    "createdAt": "2025-09-08T12:30:00Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "folderId",
      "issue": "Folder ID is required"
    }
  }
}
```

**常见错误**:
- `VALIDATION_ERROR`: 文件类型不支持、文件过大、文件夹ID无效
- `AUTHORIZATION_ERROR`: 无权限访问指定文件夹
- `STORAGE_ERROR`: MinIO存储服务错误
- `INTERNAL_ERROR`: 服务器处理文件时出错

### 获取文档列表
```http
GET /lectures?folderId=cmfb03tqk00032oz4h02jjbx6&status=UPLOADED&type=PDF
Cookie: next-auth.session-token=<session-token>
```

**查询参数**:
- `folderId` (可选): 文件夹ID过滤 (CUID格式)
- `status` (可选): 处理状态过滤 (`UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED`)
- `type` (可选): 文件类型过滤 (`PDF`, `PPTX`, `TXT`)

### 获取文档详情
```http
GET /lectures/{lectureId}
Cookie: next-auth.session-token=<session-token>
```

**参数**:
- `lectureId`: 文档ID (CUID格式)

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "cmfb03tqk00042oz4h02jjbx8",
    "title": "第一章：网络基础.pdf",
    "originalName": "第一章：网络基础.pdf",
    "type": "PDF",
    "status": "UPLOADED",
    "fileKey": "lectures/2025/09/08/cmfb03tqk00042oz4h02jjbx8.pdf",
    "size": 2048576,
    "segments": [
      {
        "id": "cmfb03tqk00052oz4h02jjbx9",
        "content": "网络协议是计算机网络中的基础概念...",
        "page": 1,
        "charStart": 0,
        "charEnd": 150
      }
    ],
    "folder": {
      "id": "cmfb03tqk00032oz4h02jjbx6",
      "name": "计算机网络"
    },
    "createdAt": "2025-09-08T12:30:00Z",
    "updatedAt": "2025-09-08T12:30:00Z"
  }
}
```

## 🎯 内容选择接口

### 创建内容选择
```http
POST /selections
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "lectureId": "lecture_456",
  "segmentIds": ["segment_789", "segment_790"],
  "generationTypes": ["translation", "summary", "glossary"]
}
```

### 获取选择列表
```http
GET /selections
Authorization: Bearer <token>
```

## 🤖 AI 内容生成接口

### 生成学习内容
```http
POST /items/generate
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "selectionId": "selection_123",
  "type": "translation",
  "options": {
    "targetLanguage": "zh",
    "includeTerms": true
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "estimatedTime": 30,
    "cost": 0.15
  }
}
```

### 获取生成状态
```http
GET /items/{itemId}/status
Authorization: Bearer <token>
```

### 获取生成内容
```http
GET /items/{itemId}
Authorization: Bearer <token>
```

## 📝 考试系统接口

### 创建考试
```http
POST /exams
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "selectionIds": ["selection_123", "selection_124"],
  "blueprint": {
    "duration": 60,
    "questionCount": 20,
    "questionTypes": {
      "multiple_choice": 15,
      "short_answer": 5
    },
    "difficulty": {
      "easy": 30,
      "medium": 50,
      "hard": 20
    }
  }
}
```

### 开始考试
```http
POST /exams/{examId}/start
Authorization: Bearer <token>
```

### 提交答案
```http
POST /exams/{examId}/submit
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "answers": {
    "question_1": "B",
    "question_2": "正确答案是..."
  }
}
```

## 🔍 搜索接口

### 语义搜索
```http
GET /search?query=网络协议&limit=10&threshold=0.8
Authorization: Bearer <token>
```

**查询参数**:
- `query`: 搜索查询
- `limit`: 返回结果数量 (默认: 10)
- `threshold`: 相似度阈值 (默认: 0.7)

## 📊 统计接口

### 获取用户统计
```http
GET /stats/user
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "documentCount": 25,
    "studyHours": 45.5,
    "examsTaken": 8,
    "averageScore": 87.3
  }
}
```

## ❌ 错误响应格式

所有错误响应遵循统一格式：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "email",
      "issue": "邮箱格式不正确"
    }
  }
}
```

### 常见错误代码
- `AUTHENTICATION_ERROR`: 认证失败
- `AUTHORIZATION_ERROR`: 权限不足
- `VALIDATION_ERROR`: 请求参数验证失败
- `RESOURCE_NOT_FOUND`: 资源不存在
- `RATE_LIMIT_EXCEEDED`: 请求频率超限
- `INTERNAL_ERROR`: 服务器内部错误

## 🔄 分页和过滤

支持分页的接口使用统一的查询参数：
- `page`: 页码 (从1开始)
- `limit`: 每页数量 (默认: 20, 最大: 100)
- `sort`: 排序字段
- `order`: 排序方向 (`asc` 或 `desc`)

**示例**:
```http
GET /lectures?page=1&limit=10&sort=createdAt&order=desc
```

## 📋 状态码说明
- `200`: 成功
- `201`: 创建成功
- `400`: 请求错误
- `401`: 未认证
- `403`: 无权限
- `404`: 资源不存在
- `429`: 请求过于频繁
- `500`: 服务器错误

---

## 🔧 技术说明

### MinIO 存储配置
项目使用 MinIO 对象存储服务：
- **API端点**: `http://localhost:9000`
- **管理控制台**: `http://localhost:9001` (minioadmin/minioadmin123)
- **存储桶**: `study-assistant`
- **文件路径格式**: `lectures/{year}/{month}/{day}/{lectureId}.{ext}`

### 开发环境要求
- MinIO 服务必须运行且已创建 `study-assistant` 存储桶
- PostgreSQL 数据库正常运行
- NextAuth.js 会话配置正确

## 🐛 已知修复的问题

### 文件上传验证错误 (2025-09-08修复)
**问题**: 文件上传时出现 `VALIDATION_ERROR` - 参数验证失败
**原因**: Zod验证schema期望UUID格式，但数据库使用CUID格式ID
**解决**: 修改验证从 `z.string().uuid()` 改为 `z.string().min(1)`
**影响接口**: `POST /lectures`

---

**📝 更新说明**: API文档随接口开发进度更新，重要变更会在 CHANGELOG 中记录。文档同步更新于 2025-09-08，反映文件上传系统bug修复后的准确状态。