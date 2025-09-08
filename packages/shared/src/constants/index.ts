/**
 * 系统常量定义
 * 包含应用程序中使用的所有常量值
 */

/**
 * 支持的文件类型和MIME类型映射
 */
export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  TXT: 'text/plain',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

/**
 * 文件上传限制
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILES_PER_BATCH: 10,
  ALLOWED_EXTENSIONS: ['pdf', 'pptx', 'txt', 'docx'],
} as const;

/**
 * 处理状态常量
 */
export const PROCESSING_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING', 
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

/**
 * 队列名称常量
 */
export const QUEUE_NAMES = {
  INGEST: 'document-ingest',
  GENERATE: 'content-generate',
  GRADE: 'exam-grade',
  EXPORT: 'content-export',
} as const;

/**
 * 作业类型常量
 */
export const JOB_TYPES = {
  // 文档处理
  PARSE_PDF: 'parse-pdf',
  PARSE_PPTX: 'parse-pptx', 
  PARSE_TXT: 'parse-txt',
  OCR_DOCUMENT: 'ocr-document',
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  
  // 内容生成
  TRANSLATE: 'translate',
  SUMMARIZE: 'summarize',
  GENERATE_GLOSSARY: 'generate-glossary',
  CREATE_FLASHCARDS: 'create-flashcards',
  GENERATE_QUIZ: 'generate-quiz',
  
  // 评分和分析
  GRADE_MCQ: 'grade-mcq',
  GRADE_SHORT_ANSWER: 'grade-short-answer',
  GRADE_ESSAY: 'grade-essay',
  
  // 导出
  EXPORT_MARKDOWN: 'export-markdown',
  EXPORT_ANKI: 'export-anki',
  EXPORT_PDF: 'export-pdf',
} as const;

/**
 * AI模型配置常量
 */
export const AI_MODELS = {
  OPENAI: {
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    EMBEDDING_ADA_002: 'text-embedding-ada-002',
    EMBEDDING_3_SMALL: 'text-embedding-3-small',
    EMBEDDING_3_LARGE: 'text-embedding-3-large',
  },
  ANTHROPIC: {
    CLAUDE_3_OPUS: 'claude-3-opus-20240229',
    CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  },
} as const;

/**
 * 令牌使用限制
 */
export const TOKEN_LIMITS = {
  MAX_PER_REQUEST: 4000,
  MAX_PER_USER_DAILY: 50000,
  MAX_PER_USER_MONTHLY: 1000000,
  EMBEDDING_BATCH_SIZE: 100,
  WARNING_THRESHOLD: 0.8, // 80%使用时警告
} as const;

/**
 * 文档分段配置
 */
export const SEGMENTATION_CONFIG = {
  MIN_SEGMENT_LENGTH: 50,   // 最小段落长度(字符)
  MAX_SEGMENT_LENGTH: 2000, // 最大段落长度(字符)
  TARGET_SEGMENT_LENGTH: 500, // 目标段落长度(字符)
  OVERLAP_SIZE: 100,        // 重叠区域大小(字符)
  MIN_TOKEN_COUNT: 10,      // 最小词元数
  MAX_TOKEN_COUNT: 512,     // 最大词元数
} as const;

/**
 * 向量搜索配置
 */
export const VECTOR_SEARCH_CONFIG = {
  DEFAULT_SIMILARITY_THRESHOLD: 0.7,
  MAX_RESULTS: 50,
  DEFAULT_RESULTS: 10,
  EMBEDDING_DIMENSIONS: 1536, // OpenAI ada-002
} as const;

/**
 * 缓存键前缀
 */
export const CACHE_KEYS = {
  SEGMENT: 'segment:',
  EMBEDDING: 'embedding:',
  TRANSLATION: 'translation:',
  SUMMARY: 'summary:', 
  GLOSSARY: 'glossary:',
  QUIZ: 'quiz:',
  USER_STATS: 'user-stats:',
  SYSTEM_STATS: 'system-stats',
  SEARCH_RESULTS: 'search:',
} as const;

/**
 * 缓存过期时间(秒)
 */
export const CACHE_TTL = {
  SHORT: 5 * 60,        // 5分钟
  MEDIUM: 60 * 60,      // 1小时  
  LONG: 24 * 60 * 60,   // 1天
  WEEK: 7 * 24 * 60 * 60, // 1周
} as const;

/**
 * API速率限制
 */
export const RATE_LIMITS = {
  UPLOAD: {
    REQUESTS: 10,
    WINDOW: 60 * 1000, // 1分钟
  },
  GENERATE: {
    REQUESTS: 30,
    WINDOW: 60 * 1000, // 1分钟
  },
  SEARCH: {
    REQUESTS: 100,
    WINDOW: 60 * 1000, // 1分钟
  },
  EXPORT: {
    REQUESTS: 5,
    WINDOW: 60 * 1000, // 1分钟
  },
} as const;

/**
 * 支持的语言配置
 */
export const SUPPORTED_LANGUAGES = {
  'zh': {
    name: '简体中文',
    nativeName: '简体中文',
    code: 'zh',
    ocrCode: 'chi_sim',
  },
  'zh-tw': {
    name: '繁体中文',
    nativeName: '繁體中文',
    code: 'zh-tw',
    ocrCode: 'chi_tra',
  },
  'en': {
    name: 'English',
    nativeName: 'English',
    code: 'en',
    ocrCode: 'eng',
  },
} as const;

/**
 * OCR引擎配置
 */
export const OCR_ENGINES = {
  TESSERACT: {
    name: 'Tesseract',
    confidence_threshold: 60,
    supported_languages: ['chi_sim', 'chi_tra', 'eng'],
  },
  PADDLEOCR: {
    name: 'PaddleOCR',
    confidence_threshold: 0.7,
    supported_languages: ['ch', 'en'],
  },
  EASYOCR: {
    name: 'EasyOCR',
    confidence_threshold: 0.6,
    supported_languages: ['ch_sim', 'ch_tra', 'en'],
  },
} as const;

/**
 * 测验难度等级
 */
export const DIFFICULTY_LEVELS = {
  EASY: {
    label: '简单',
    color: '#10B981', // green
    score_weight: 1.0,
  },
  MEDIUM: {
    label: '中等',
    color: '#F59E0B', // yellow
    score_weight: 1.2,
  },
  HARD: {
    label: '困难',
    color: '#EF4444', // red
    score_weight: 1.5,
  },
} as const;

/**
 * 题型配置
 */
export const QUESTION_TYPES = {
  MCQ: {
    name: '选择题',
    icon: '📝',
    auto_gradable: true,
    max_score: 100,
  },
  FILL_BLANK: {
    name: '填空题',
    icon: '✏️',
    auto_gradable: true,
    max_score: 100,
  },
  SHORT_ANSWER: {
    name: '简答题',
    icon: '💭',
    auto_gradable: true,
    max_score: 100,
  },
  ESSAY: {
    name: '论述题',
    icon: '📄',
    auto_gradable: false,
    max_score: 100,
  },
} as const;

/**
 * 导出格式配置
 */
export const EXPORT_FORMATS = {
  MARKDOWN: {
    extension: '.md',
    mime_type: 'text/markdown',
    supports_images: true,
  },
  CSV: {
    extension: '.csv',
    mime_type: 'text/csv',
    supports_images: false,
  },
  JSON: {
    extension: '.json',
    mime_type: 'application/json',
    supports_images: false,
  },
  ANKI: {
    extension: '.apkg',
    mime_type: 'application/octet-stream',
    supports_images: true,
  },
  PDF: {
    extension: '.pdf',
    mime_type: 'application/pdf',
    supports_images: true,
  },
} as const;

/**
 * 系统事件类型
 */
export const EVENT_TYPES = {
  // 文档事件
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_FAILED: 'document.failed',
  
  // 生成事件
  CONTENT_GENERATED: 'content.generated',
  CONTENT_EXPORTED: 'content.exported',
  
  // 用户事件
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  
  // 考试事件
  EXAM_STARTED: 'exam.started',
  EXAM_SUBMITTED: 'exam.submitted',
  EXAM_GRADED: 'exam.graded',
} as const;

/**
 * 错误代码常量
 */
export const ERROR_CODES = {
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // 文件错误
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_CORRUPT: 'FILE_CORRUPT',
  
  // 处理错误
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  OCR_FAILED: 'OCR_FAILED',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  
  // 生成错误
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  TOKEN_LIMIT_EXCEEDED: 'TOKEN_LIMIT_EXCEEDED',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',
  
  // 数据错误
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // 系统错误
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * 默认配置值
 */
export const DEFAULTS = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100,
  },
  LANGUAGE: 'zh',
  DIFFICULTY: 'MEDIUM',
  OCR_ENGINE: 'paddleocr',
  CACHE_TTL: CACHE_TTL.MEDIUM,
  EMBEDDING_MODEL: AI_MODELS.OPENAI.EMBEDDING_ADA_002,
  CHAT_MODEL: AI_MODELS.OPENAI.GPT_3_5_TURBO,
} as const;