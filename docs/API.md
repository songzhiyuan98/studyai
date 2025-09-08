# 🔌 API 接口文档

## 📋 接口概览

Study Assistant 提供 RESTful API 用于所有前后端通信。

### 🔗 Base URL
- **开发环境**: `http://localhost:4000/api`
- **生产环境**: `https://api.study-assistant.com`

### 🔐 认证方式
所有接口（除认证接口外）需要在请求头中包含 JWT Token：
```http
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
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "folder_123",
      "name": "计算机网络",
      "description": "网络相关课程材料",
      "lectureCount": 5,
      "createdAt": "2025-09-08T10:00:00Z"
    }
  ]
}
```

### 创建文件夹
```http
POST /folders
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "name": "数据库系统",
  "description": "数据库课程资料"
}
```

## 📄 文档管理接口

### 上传文档
```http
POST /lectures
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表单数据**:
- `file`: 上传的文件 (PDF/PPTX/TXT)
- `folderId`: 目标文件夹ID
- `title`: 文档标题 (可选)

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "lecture_456",
    "title": "第一章：网络基础",
    "type": "PDF",
    "status": "PROCESSING",
    "fileUrl": "https://storage.example.com/lecture_456.pdf",
    "folderId": "folder_123"
  }
}
```

### 获取文档列表
```http
GET /lectures?folderId=folder_123&status=PROCESSED&type=PDF
Authorization: Bearer <token>
```

**查询参数**:
- `folderId` (可选): 文件夹ID过滤
- `status` (可选): 处理状态过滤 (`PROCESSING`, `PROCESSED`, `FAILED`)
- `type` (可选): 文件类型过滤 (`PDF`, `PPTX`, `TXT`)

### 获取文档详情
```http
GET /lectures/{lectureId}
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "lecture_456",
    "title": "第一章：网络基础",
    "type": "PDF",
    "status": "PROCESSED",
    "fileUrl": "https://storage.example.com/lecture_456.pdf",
    "segments": [
      {
        "id": "segment_789",
        "content": "网络协议是计算机网络中的基础概念...",
        "page": 1,
        "charStart": 0,
        "charEnd": 150
      }
    ],
    "folder": {
      "id": "folder_123",
      "name": "计算机网络"
    }
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

**📝 更新说明**: API文档随接口开发进度更新，重要变更会在 CHANGELOG 中记录。