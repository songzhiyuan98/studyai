import {
  shouldUseStudyRetrieval,
  shouldUseTeacherMode,
  type ChatHistoryTurn,
  type ChatMode,
} from './chat-llm';
import { extractRequestedPageNumber } from './rag-context';

export type ChatPlannerToolName =
  | 'library.catalog'
  | 'scope.resolve'
  | 'chat.respond'
  | 'source.preview'
  | 'rag.retrieve'
  | 'agent.teach'
  | 'artifact.save'
  | 'reader.open'
  | 'library.manage';

export type ChatPlannerIntent =
  | 'casual_chat'
  | 'guided_learning'
  | 'retrieval_answer'
  | 'assessment_generation'
  | 'fixed_action'
  | 'save_request'
  | 'reader_navigation'
  | 'library_operation';

export type ChatPlannerToolCall = {
  name: ChatPlannerToolName;
  reason: string;
};

export type ChatTurnPlan = {
  intent: ChatPlannerIntent;
  requiresRetrieval: boolean;
  retrievalBreadth: 'focused' | 'broad_lesson' | 'broad_assessment';
  teacherModeHint: boolean;
  delegatedAgent: 'teaching_agent' | 'assessment_agent' | 'chat_agent' | 'tool_agent';
  requestedPage: number | null;
  requiresConfirmation: boolean;
  tools: ChatPlannerToolCall[];
};

function hasSaveIntent(message: string) {
  return /\b(save|收藏|保存|存一下|save this)\b/i.test(message);
}

function hasReaderNavigationIntent(message: string) {
  return /\b(open|show|go to|source|citation|reader|打开|跳到|来源|原文)\b/i.test(message);
}

function hasLibraryOperationIntent(message: string) {
  return /\b(upload|rename|delete|move|folder|file|library|上传|重命名|删除|移动|文件夹|归档)\b/i.test(message);
}

function hasAssessmentIntent(message: string, mode: ChatMode) {
  return mode === 'mini_quiz' && /\b(midterm|final|exam|mock|practice test|test)\b/i.test(message)
    || /(期中|期末|考试|模拟|测试|卷子|试卷|114a)/i.test(message);
}

export function planChatTurn({
  mode,
  message,
  history = [],
  hasExplicitScope = false,
}: {
  mode: ChatMode;
  message: string;
  history?: ChatHistoryTurn[];
  hasExplicitScope?: boolean;
}): ChatTurnPlan {
  const teacherModeHint = shouldUseTeacherMode(message, mode);
  const requiresRetrieval = shouldUseStudyRetrieval({
    mode,
    message,
    history,
    hasExplicitScope,
  });
  const requestedPage = extractRequestedPageNumber(message);
  const retrievalBreadth: ChatTurnPlan['retrievalBreadth'] = hasAssessmentIntent(message, mode)
    ? 'broad_assessment'
    : teacherModeHint && !requestedPage
      ? 'broad_lesson'
      : 'focused';
  const tools: ChatPlannerToolCall[] = [];
  let intent: ChatPlannerIntent = 'casual_chat';
  let requiresConfirmation = false;
  let delegatedAgent: ChatTurnPlan['delegatedAgent'] = 'chat_agent';

  if (hasLibraryOperationIntent(message)) {
    intent = 'library_operation';
    delegatedAgent = 'tool_agent';
    requiresConfirmation = true;
    tools.push({ name: 'library.manage', reason: 'The student is asking to change or organize Library files.' });
  } else if (hasSaveIntent(message)) {
    intent = 'save_request';
    delegatedAgent = 'tool_agent';
    requiresConfirmation = true;
    tools.push({ name: 'artifact.save', reason: 'The student is asking to save a useful output.' });
  } else if (hasReaderNavigationIntent(message)) {
    intent = 'reader_navigation';
    delegatedAgent = 'tool_agent';
    tools.push({ name: 'reader.open', reason: 'The student is asking to inspect the cited source or original material.' });
  } else if (retrievalBreadth === 'broad_assessment') {
    intent = 'assessment_generation';
    delegatedAgent = 'assessment_agent';
  } else if (mode !== 'free') {
    intent = 'fixed_action';
    delegatedAgent = mode === 'mini_quiz' ? 'assessment_agent' : 'teaching_agent';
  } else if (teacherModeHint) {
    intent = 'guided_learning';
    delegatedAgent = 'teaching_agent';
  } else if (requiresRetrieval) {
    intent = 'retrieval_answer';
    delegatedAgent = 'teaching_agent';
  }

  if (requiresRetrieval) {
    tools.push({
      name: 'library.catalog',
      reason: 'Inspect the student’s Library folders and files before deciding source scope.',
    });
    tools.push({
      name: 'scope.resolve',
      reason: 'Resolve the source scope from Library metadata before retrieving chunks.',
    });
    if (!hasExplicitScope) {
      tools.push({ name: 'source.preview', reason: 'The source scope may need recommendation or confirmation.' });
    }
    tools.push({
      name: 'rag.retrieve',
      reason: retrievalBreadth === 'broad_assessment'
        ? 'Retrieve representative coverage across the selected course materials for assessment generation.'
        : retrievalBreadth === 'broad_lesson'
          ? 'Retrieve broad coverage across the selected lecture or topic for guided learning.'
          : requestedPage
          ? `Retrieve exact page ${requestedPage} before semantic context.`
          : 'Retrieve grounded course context.',
    });
  }

  if (delegatedAgent === 'teaching_agent' || delegatedAgent === 'assessment_agent') {
    tools.push({
      name: delegatedAgent === 'assessment_agent' ? 'agent.teach' : 'agent.teach',
      reason: delegatedAgent === 'assessment_agent'
        ? 'Delegate final response to the teaching agent with assessment formatting.'
        : 'Delegate final response to the teaching agent for explanation, examples, and follow-up.',
    });
  }

  tools.push({ name: 'chat.respond', reason: 'Stream a conversational assistant response.' });

  return {
    intent,
    requiresRetrieval,
    retrievalBreadth,
    teacherModeHint,
    delegatedAgent,
    requestedPage,
    requiresConfirmation,
    tools,
  };
}
