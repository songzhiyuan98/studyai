type ContextStrategy = 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';

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
