/**
 * 共享类型定义
 * 定义整个应用程序中使用的通用数据结构
 */

// 从Prisma导入基础类型
export * from '@prisma/client';

/**
 * API响应通用接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * 文档处理状态
 */
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * 文档类型
 */
export type DocumentType = 'PDF' | 'PPTX' | 'TXT' | 'DOCX';

/**
 * 支持的语言
 */
export type SupportedLanguage = 'zh' | 'en' | 'zh-tw';

/**
 * 文档片段接口
 */
export interface DocumentSegment {
  id: string;
  lectureId: string;
  text: string;
  tokenCount: number;
  // 位置信息
  page?: number;
  slide?: number;
  charStart?: number;
  charEnd?: number;
  bbox?: BoundingBox;
  // 元数据
  hash: string;
  embedding?: number[];
  createdAt: Date;
}

/**
 * 边界框坐标
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 用户选择接口
 */
export interface ContentSelection {
  id: string;
  userId: string;
  lectureId: string;
  segmentIds: string[];
  createdAt: Date;
  // 关联数据
  lecture?: Lecture;
  segments?: DocumentSegment[];
  stats?: SelectionStats;
}

/**
 * 选择统计信息
 */
export interface SelectionStats {
  segmentCount: number;
  totalTokens: number;
  estimatedCost: number;
  languages: string[];
}

/**
 * 内容生成类型
 */
export type ItemType = 'TRANSLATION' | 'SUMMARY' | 'GLOSSARY' | 'FLASHCARDS' | 'QUIZ';

/**
 * 生成的内容项目
 */
export interface GeneratedItem {
  id: string;
  selectionId: string;
  type: ItemType;
  payload: ItemPayload;
  sourceRefs: SourceReference[];
  relatedRefs?: SourceReference[];
  // AI元数据
  model?: string;
  tokenUsed?: number;
  createdAt: Date;
}

/**
 * 来源引用
 */
export interface SourceReference {
  segmentId: string;
  page?: number;
  slide?: number;
  charSpan?: [number, number];
  confidence?: number;
}

/**
 * 内容载荷联合类型
 */
export type ItemPayload = 
  | TranslationPayload 
  | SummaryPayload 
  | GlossaryPayload 
  | FlashcardsPayload 
  | QuizPayload;

/**
 * 翻译内容
 */
export interface TranslationPayload {
  type: 'translation';
  sourceLanguage: string;
  targetLanguage: string;
  translations: Array<{
    original: string;
    translated: string;
    sourceRefs: string[];
  }>;
}

/**
 * 摘要内容
 */
export interface SummaryPayload {
  type: 'summary';
  language: string;
  bullets: Array<{
    point: string;
    sourceRefs: string[];
  }>;
  notes?: string;
}

/**
 * 术语表内容
 */
export interface GlossaryPayload {
  type: 'glossary';
  language: string;
  terms: Array<{
    term: string;
    definition: string;
    example?: string;
    sourceRefs: string[];
    tags?: string[];
  }>;
}

/**
 * 闪卡内容
 */
export interface FlashcardsPayload {
  type: 'flashcards';
  language: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
    tips?: string[];
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    sourceRefs: string[];
  }>;
}

/**
 * 测验内容
 */
export interface QuizPayload {
  type: 'quiz';
  questions: QuizQuestion[];
  settings: QuizSettings;
}

/**
 * 测验题目
 */
export interface QuizQuestion {
  id: string;
  type: 'MCQ' | 'FILL_BLANK' | 'SHORT_ANSWER' | 'ESSAY';
  question: string;
  // MCQ选项
  choices?: string[];
  correctAnswer?: string | number;
  // 填空
  blanks?: string[];
  // 评分标准
  rubric?: GradingRubric;
  // 元数据
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  sourceRefs: string[];
  learningObjectives?: string[];
}

/**
 * 测验设置
 */
export interface QuizSettings {
  timeLimit?: number; // 分钟
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showFeedback: 'immediate' | 'after_submission' | 'never';
  attemptsAllowed: number;
}

/**
 * 评分标准
 */
export interface GradingRubric {
  maxScore: number;
  criteria: Array<{
    name: string;
    description: string;
    weight: number; // 权重百分比
    levels: Array<{
      score: number;
      description: string;
    }>;
  }>;
  keyPoints?: string[];
}

/**
 * 考试尝试
 */
export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  answers: Record<string, any>;
  score?: number;
  breakdown?: ExamBreakdown;
  startedAt: Date;
  submittedAt?: Date;
  timeSpent?: number; // 秒
}

/**
 * 考试结果分解
 */
export interface ExamBreakdown {
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionResults: Array<{
    questionId: string;
    score: number;
    maxScore: number;
    feedback?: string;
    citedRefs?: string[];
  }>;
  categoryScores?: Record<string, {
    score: number;
    maxScore: number;
  }>;
}

/**
 * 向量搜索结果
 */
export interface VectorSearchResult {
  segment: DocumentSegment;
  similarity: number;
  highlight?: string;
}

/**
 * 搜索过滤器
 */
export interface SearchFilters {
  lectureIds?: string[];
  courseId?: string;
  excludeSegmentIds?: string[];
  minSimilarity?: number;
  contentTypes?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * 作业队列任务数据
 */
export interface JobData {
  // 通用属性
  id: string;
  type: string;
  userId?: string;
  
  // 文档处理任务
  lectureId?: string;
  fileUrl?: string;
  processingOptions?: {
    ocrThreshold?: number;
    languageHint?: string;
    preserveFormatting?: boolean;
  };
  
  // 内容生成任务
  selectionId?: string;
  itemTypes?: ItemType[];
  generationOptions?: {
    targetLanguage?: string;
    difficultyLevel?: 'basic' | 'intermediate' | 'advanced';
    maxTokens?: number;
  };
  
  // 评分任务
  examId?: string;
  attemptId?: string;
  answers?: Record<string, any>;
}

/**
 * 系统统计信息
 */
export interface SystemStats {
  users: {
    total: number;
    active: number;
    new: number;
  };
  content: {
    lectures: number;
    segments: number;
    selections: number;
    items: number;
  };
  performance: {
    avgProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
  resources: {
    queueLength: number;
    processingJobs: number;
    tokensUsedToday: number;
  };
}

/**
 * 用户使用统计
 */
export interface UserStats {
  lecturesUploaded: number;
  selectionsCreated: number;
  itemsGenerated: number;
  examsCompleted: number;
  tokensUsed: {
    today: number;
    thisMonth: number;
    total: number;
  };
  averageGrades: {
    overall: number;
    bySubject: Record<string, number>;
  };
}

/**
 * 文件上传接口
 */
export interface FileUpload {
  file: File;
  courseId: string;
  title?: string;
  type: DocumentType;
  metadata?: Record<string, any>;
}

/**
 * 上传进度
 */
export interface UploadProgress {
  filename: string;
  progress: number; // 0-100
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  error?: string;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format: 'markdown' | 'csv' | 'json' | 'anki' | 'pdf';
  language?: string;
  includeSourceRefs: boolean;
  template?: string;
}

/**
 * 通知类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * 系统通知
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}