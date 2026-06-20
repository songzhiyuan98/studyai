type ContextStrategy = 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';
type RetrievalBreadth = 'focused' | 'broad_lesson' | 'broad_assessment';

export type ChatSessionMemory = {
  version: 1;
  lessonState?: {
    lectureIds: string[];
    contextStrategy?: ContextStrategy;
    retrievalBreadth?: RetrievalBreadth;
    sourceScope?: string;
    matchedLabels?: string[];
    currentGoal?: string;
    nextStep?: string;
    language?: 'Chinese' | 'English';
    updatedAt?: string;
  };
};

type PlanLike = {
  intent: string;
  requiresRetrieval: boolean;
  retrievalBreadth: RetrievalBreadth;
  contextStrategy: ContextStrategy;
  teacherModeHint: boolean;
  delegatedAgent: string;
  [key: string]: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function pickContextStrategy(value: unknown): ContextStrategy | undefined {
  return value === 'focused_rag' || value === 'broad_rag' || value === 'lecture_pack' || value === 'long_document_map'
    ? value
    : undefined;
}

function pickRetrievalBreadth(value: unknown): RetrievalBreadth | undefined {
  return value === 'focused' || value === 'broad_lesson' || value === 'broad_assessment'
    ? value
    : undefined;
}

function detectLanguage(message: string): 'Chinese' | 'English' {
  return /[\u4e00-\u9fff]/.test(message) ? 'Chinese' : 'English';
}

export function isLessonContinuationTurn(message: string) {
  return /\b(continue|go on|next|more|again|keep going|walk me through|that example|this part|explain more|simpler)\b/i.test(message)
    || /(继续|接着|下一个|再讲|多讲|往下|然后呢|没懂|不懂|这个|刚才|例子|简单点|讲细|展开)/i.test(message);
}

export function parseChatSessionMemory(scopeJson: unknown): ChatSessionMemory | null {
  if (!isObject(scopeJson)) return null;

  const lessonState = isObject(scopeJson.lessonState) ? scopeJson.lessonState : null;
  if (!lessonState) {
    const legacyLectureIds = stringArray(scopeJson.lectureIds);
    return legacyLectureIds.length > 0
      ? { version: 1, lessonState: { lectureIds: legacyLectureIds } }
      : null;
  }

  const lectureIds = stringArray(lessonState.lectureIds);
  if (lectureIds.length === 0) return null;

  return {
    version: 1,
    lessonState: {
      lectureIds,
      contextStrategy: pickContextStrategy(lessonState.contextStrategy),
      retrievalBreadth: pickRetrievalBreadth(lessonState.retrievalBreadth),
      sourceScope: typeof lessonState.sourceScope === 'string' ? lessonState.sourceScope : undefined,
      matchedLabels: stringArray(lessonState.matchedLabels),
      currentGoal: typeof lessonState.currentGoal === 'string' ? lessonState.currentGoal : undefined,
      nextStep: typeof lessonState.nextStep === 'string' ? lessonState.nextStep : undefined,
      language: lessonState.language === 'Chinese' || lessonState.language === 'English' ? lessonState.language : undefined,
      updatedAt: typeof lessonState.updatedAt === 'string' ? lessonState.updatedAt : undefined,
    },
  };
}

export function resolveInheritedLessonScope({
  explicitLectureIds,
  memory,
  message,
}: {
  explicitLectureIds?: string[];
  memory: ChatSessionMemory | null;
  message: string;
}) {
  if (explicitLectureIds?.length) {
    return {
      inherited: false,
      lectureIds: explicitLectureIds,
      reason: 'explicit_scope' as const,
    };
  }

  const rememberedLectureIds = memory?.lessonState?.lectureIds || [];
  if (rememberedLectureIds.length > 0 && isLessonContinuationTurn(message)) {
    return {
      inherited: true,
      lectureIds: rememberedLectureIds,
      reason: 'continuation_turn' as const,
    };
  }

  return {
    inherited: false,
    lectureIds: undefined,
    reason: 'no_memory_match' as const,
  };
}

export function applyLessonMemoryToPlan<TPlan extends PlanLike>({
  plan,
  memory,
  message,
  inheritedScope,
}: {
  plan: TPlan;
  memory: ChatSessionMemory | null;
  message: string;
  inheritedScope: boolean;
}): TPlan {
  if (!inheritedScope || !memory?.lessonState || !isLessonContinuationTurn(message)) {
    return plan;
  }

  return {
    ...plan,
    intent: 'guided_learning',
    requiresRetrieval: true,
    retrievalBreadth: memory.lessonState.retrievalBreadth || 'broad_lesson',
    contextStrategy: memory.lessonState.contextStrategy || plan.contextStrategy,
    teacherModeHint: true,
    delegatedAgent: 'teaching_agent',
  };
}

export function buildLessonMemoryFromRetrieval({
  previousMemory,
  message,
  retrieval,
  lectureIds,
  sourceMaterials,
}: {
  previousMemory: ChatSessionMemory | null;
  message: string;
  retrieval: {
    contextStrategy?: unknown;
    retrievalBreadth?: unknown;
    sourceScope?: unknown;
    contextCoverageLabel?: unknown;
    libraryScope?: unknown;
  };
  lectureIds: string[];
  sourceMaterials: Array<{
    title: string;
    detail: string;
    count: number;
  }>;
}): ChatSessionMemory {
  const libraryScope = isObject(retrieval.libraryScope) ? retrieval.libraryScope : {};
  const matchedLabels = stringArray(libraryScope.matchedLabels);
  const materialLabels = sourceMaterials.map((material) => material.title).filter(Boolean);
  const contextStrategy = pickContextStrategy(retrieval.contextStrategy)
    || previousMemory?.lessonState?.contextStrategy;
  const retrievalBreadth = pickRetrievalBreadth(retrieval.retrievalBreadth)
    || previousMemory?.lessonState?.retrievalBreadth;

  return {
    version: 1,
    lessonState: {
      lectureIds,
      contextStrategy,
      retrievalBreadth,
      sourceScope: typeof retrieval.sourceScope === 'string' ? retrieval.sourceScope : previousMemory?.lessonState?.sourceScope,
      matchedLabels: matchedLabels.length > 0 ? matchedLabels : materialLabels,
      currentGoal: message,
      nextStep: 'Continue the current lesson from the next concept or example instead of restarting the scope.',
      language: detectLanguage(message),
      updatedAt: new Date().toISOString(),
    },
  };
}
