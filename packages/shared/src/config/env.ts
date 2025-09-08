/**
 * 环境变量配置管理
 * 提供类型安全的环境变量访问和验证
 */

import { z } from 'zod';

/**
 * 环境变量验证模式
 * 确保所有必需的配置都已正确设置
 */
const envSchema = z.object({
  // 基础配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  API_PORT: z.string().transform(Number).default(4000),

  // 数据库配置
  DATABASE_URL: z.string().url('数据库URL格式不正确'),
  DB_POOL_MIN: z.string().transform(Number).default(2),
  DB_POOL_MAX: z.string().transform(Number).default(10),

  // Redis配置
  REDIS_URL: z.string().url('Redis URL格式不正确'),
  REDIS_MAX_RETRIES: z.string().transform(Number).default(3),
  REDIS_RETRY_DELAY: z.string().transform(Number).default(1000),

  // 文件存储配置
  STORAGE_TYPE: z.enum(['local', 's3', 'minio']).default('minio'),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET_NAME: z.string().default('study-assistant'),
  MINIO_USE_SSL: z.string().transform(val => val === 'true').default(false),

  // AI服务配置
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key 是必需的'),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL_CHAT: z.string().default('gpt-3.5-turbo'),
  OPENAI_MODEL_EMBEDDING: z.string().default('text-embedding-ada-002'),

  // 认证配置
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret 至少需要32个字符'),
  NEXTAUTH_URL: z.string().url('NextAuth URL格式不正确'),
  JWT_SECRET: z.string().min(32, 'JWT secret 至少需要32个字符'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // 队列配置
  QUEUE_CONCURRENCY: z.string().transform(Number).default(5),
  QUEUE_MAX_ATTEMPTS: z.string().transform(Number).default(3),
  TASK_TIMEOUT_INGEST: z.string().transform(Number).default(300000),
  TASK_TIMEOUT_GENERATE: z.string().transform(Number).default(180000),

  // 安全配置
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000),
  MAX_FILE_SIZE: z.string().default('50mb'),

  // 监控配置
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  METRICS_PORT: z.string().transform(Number).default(9090),

  // OCR配置
  OCR_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  OCR_ENGINE: z.enum(['tesseract', 'paddleocr', 'both']).default('paddleocr'),
  OCR_CONFIDENCE_THRESHOLD: z.string().transform(Number).default(0.7),

  // 缓存配置
  CACHE_TTL_SHORT: z.string().transform(Number).default(300),
  CACHE_TTL_MEDIUM: z.string().transform(Number).default(3600),
  CACHE_TTL_LONG: z.string().transform(Number).default(86400),

  // 业务配置
  MAX_TOKENS_PER_REQUEST: z.string().transform(Number).default(4000),
  MAX_SEGMENTS_PER_SELECTION: z.string().transform(Number).default(50),
  USER_DAILY_TOKEN_LIMIT: z.string().transform(Number).default(10000),

  // 开发配置
  ENABLE_DEV_TOOLS: z.string().transform(val => val === 'true').default(false),
  ENABLE_QUERY_LOGGING: z.string().transform(val => val === 'true').default(false),
  DEBUG_ROUTES: z.string().transform(val => val === 'true').default(false),
});

/**
 * 解析和验证环境变量
 */
function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 环境变量配置错误:');
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

/**
 * 类型安全的环境变量配置
 */
export const env = parseEnv();

/**
 * 环境变量类型定义
 */
export type Environment = z.infer<typeof envSchema>;

/**
 * 检查是否为开发环境
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * 检查是否为生产环境
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * 检查是否为测试环境
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * 数据库配置
 */
export const dbConfig = {
  url: env.DATABASE_URL,
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
  },
};

/**
 * Redis配置
 */
export const redisConfig = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: env.REDIS_MAX_RETRIES,
  retryDelayOnFailover: env.REDIS_RETRY_DELAY,
};

/**
 * 存储配置
 */
export const storageConfig = {
  type: env.STORAGE_TYPE,
  minio: {
    endpoint: env.MINIO_ENDPOINT || 'localhost:9000',
    accessKey: env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: env.MINIO_SECRET_KEY || 'minioadmin123',
    bucketName: env.MINIO_BUCKET_NAME,
    useSSL: env.MINIO_USE_SSL,
  },
};

/**
 * AI服务配置
 */
export const aiConfig = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
    chatModel: env.OPENAI_MODEL_CHAT,
    embeddingModel: env.OPENAI_MODEL_EMBEDDING,
  },
  tokens: {
    maxPerRequest: env.MAX_TOKENS_PER_REQUEST,
    dailyUserLimit: env.USER_DAILY_TOKEN_LIMIT,
  },
};

/**
 * 队列配置
 */
export const queueConfig = {
  concurrency: env.QUEUE_CONCURRENCY,
  maxAttempts: env.QUEUE_MAX_ATTEMPTS,
  timeouts: {
    ingest: env.TASK_TIMEOUT_INGEST,
    generate: env.TASK_TIMEOUT_GENERATE,
  },
};

/**
 * 安全配置
 */
export const securityConfig = {
  cors: {
    origins: env.CORS_ORIGINS.split(',').map(origin => origin.trim()),
  },
  rateLimit: {
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
  },
};

/**
 * OCR配置
 */
export const ocrConfig = {
  serviceUrl: env.OCR_SERVICE_URL,
  engine: env.OCR_ENGINE,
  confidenceThreshold: env.OCR_CONFIDENCE_THRESHOLD,
};

/**
 * 缓存配置
 */
export const cacheConfig = {
  ttl: {
    short: env.CACHE_TTL_SHORT,
    medium: env.CACHE_TTL_MEDIUM,
    long: env.CACHE_TTL_LONG,
  },
};

/**
 * 开发配置
 */
export const devConfig = {
  enableDevTools: env.ENABLE_DEV_TOOLS,
  enableQueryLogging: env.ENABLE_QUERY_LOGGING,
  debugRoutes: env.DEBUG_ROUTES,
};

/**
 * 打印配置摘要(生产环境隐藏敏感信息)
 */
export function printConfigSummary() {
  console.log('🔧 系统配置摘要:');
  console.log(`   环境: ${env.NODE_ENV}`);
  console.log(`   端口: Web=${env.PORT}, API=${env.API_PORT}`);
  console.log(`   数据库: ${env.DATABASE_URL.split('@')[1] || '配置已隐藏'}`);
  console.log(`   存储: ${env.STORAGE_TYPE}`);
  console.log(`   AI模型: ${env.OPENAI_MODEL_CHAT}`);
  console.log(`   OCR引擎: ${env.OCR_ENGINE}`);
  console.log(`   日志级别: ${env.LOG_LEVEL}`);
  
  if (isDevelopment) {
    console.log(`   开发工具: ${env.ENABLE_DEV_TOOLS ? '启用' : '禁用'}`);
  }
}