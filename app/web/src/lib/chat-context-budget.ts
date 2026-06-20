type ContextStrategy = 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';
type RetrievalBreadth = 'focused' | 'broad_lesson' | 'broad_assessment';

export const CHAT_CONTEXT_SEGMENT_FETCH_LIMIT = 180;

export function getChatContextCharBudget({
  contextStrategy,
}: {
  contextStrategy: ContextStrategy;
}) {
  if (contextStrategy === 'lecture_pack') {
    return 18000;
  }

  if (contextStrategy === 'long_document_map' || contextStrategy === 'broad_rag') {
    return 9000;
  }

  return 1800;
}

export function getChatContextCoverageLabel({
  contextStrategy,
  retrievalBreadth,
}: {
  contextStrategy: ContextStrategy;
  retrievalBreadth: RetrievalBreadth;
}) {
  if (contextStrategy === 'lecture_pack') {
    return 'lecture-order lesson pack';
  }

  if (contextStrategy === 'long_document_map') {
    return 'long-document map coverage';
  }

  if (retrievalBreadth === 'broad_assessment') {
    return 'exam scope coverage';
  }

  if (retrievalBreadth === 'broad_lesson') {
    return 'lesson scope coverage';
  }

  return 'focused source context';
}
