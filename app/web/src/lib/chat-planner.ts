import {
  shouldUseStudyRetrieval,
  shouldUseTeacherMode,
  type ChatHistoryTurn,
  type ChatMode,
} from './chat-llm';
import { extractRequestedPageNumber } from './rag-context';

export type ChatPlannerToolName =
  | 'chat.respond'
  | 'source.preview'
  | 'rag.retrieve'
  | 'artifact.save'
  | 'reader.open'
  | 'library.manage';

export type ChatPlannerIntent =
  | 'casual_chat'
  | 'guided_learning'
  | 'retrieval_answer'
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
  teacherModeHint: boolean;
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
  const tools: ChatPlannerToolCall[] = [];
  let intent: ChatPlannerIntent = 'casual_chat';
  let requiresConfirmation = false;

  if (hasLibraryOperationIntent(message)) {
    intent = 'library_operation';
    requiresConfirmation = true;
    tools.push({ name: 'library.manage', reason: 'The student is asking to change or organize Library files.' });
  } else if (hasSaveIntent(message)) {
    intent = 'save_request';
    requiresConfirmation = true;
    tools.push({ name: 'artifact.save', reason: 'The student is asking to save a useful output.' });
  } else if (hasReaderNavigationIntent(message)) {
    intent = 'reader_navigation';
    tools.push({ name: 'reader.open', reason: 'The student is asking to inspect the cited source or original material.' });
  } else if (mode !== 'free') {
    intent = 'fixed_action';
  } else if (teacherModeHint) {
    intent = 'guided_learning';
  } else if (requiresRetrieval) {
    intent = 'retrieval_answer';
  }

  if (requiresRetrieval) {
    if (!hasExplicitScope) {
      tools.push({ name: 'source.preview', reason: 'The source scope may need recommendation or confirmation.' });
    }
    tools.push({
      name: 'rag.retrieve',
      reason: requestedPage ? `Retrieve exact page ${requestedPage} before semantic context.` : 'Retrieve grounded course context.',
    });
  }

  tools.push({ name: 'chat.respond', reason: 'Stream a conversational assistant response.' });

  return {
    intent,
    requiresRetrieval,
    teacherModeHint,
    requestedPage,
    requiresConfirmation,
    tools,
  };
}
