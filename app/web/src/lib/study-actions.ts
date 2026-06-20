export type StudyActionId = 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';
export type StudyArtifactType = StudyActionId | 'translate';
export type StudyItemType = 'TRANSLATION' | 'SUMMARY' | 'GLOSSARY' | 'FLASHCARDS' | 'QUIZ';

export type StudyAction = {
  id: StudyActionId;
  label: string;
  itemType: Exclude<StudyItemType, 'TRANSLATION'>;
};

export type StudySourceRef = {
  lectureId: string;
  segmentId: string;
  page: number | null;
  slide: number | null;
  charStart: number | null;
  charEnd: number | null;
  label: string;
  score?: number;
  reason?: 'lexical' | 'nearby' | 'vector' | 'hybrid';
};

export type StudyArtifact = {
  id?: string;
  type: StudyArtifactType;
  itemType: StudyItemType;
  title: string;
  content: string;
  sourceRefs: StudySourceRef[];
  relatedRefs?: StudySourceRef[];
  createdAt?: string | Date;
};

export type StoredStudyItemRow = {
  id: string;
  type: StudyItemType;
  payloadJson: unknown;
  sourceRefs: unknown;
  relatedRefs?: unknown;
  createdAt: string | Date;
};

export const studyActions = [
  { id: 'explain', label: 'Explain', itemType: 'SUMMARY' },
  { id: 'summarize', label: 'Summarize', itemType: 'SUMMARY' },
  { id: 'key_terms', label: 'Key terms', itemType: 'GLOSSARY' },
  { id: 'mini_quiz', label: 'Mini quiz', itemType: 'QUIZ' },
  { id: 'cheat_sheet', label: 'Cheat sheet', itemType: 'FLASHCARDS' },
] as const satisfies readonly StudyAction[];

const titlePrefixes: Record<StudyActionId, string> = {
  explain: 'Explain',
  summarize: 'Summary from',
  key_terms: 'Key terms from',
  mini_quiz: 'Mini quiz from',
  cheat_sheet: 'Cheat sheet draft from',
};

const placeholderIntros: Record<StudyActionId, string> = {
  explain: 'Explanation draft grounded in the selected source:',
  summarize: 'Summary draft grounded in the selected source:',
  key_terms: 'Key-term draft grounded in the selected source:',
  mini_quiz: 'Mini-quiz draft grounded in the selected source:',
  cheat_sheet: 'Cheat-sheet draft grounded in the selected source:',
};

const itemTypeFallbackAction: Record<StudyItemType, StudyArtifactType> = {
  TRANSLATION: 'translate',
  SUMMARY: 'summarize',
  GLOSSARY: 'key_terms',
  QUIZ: 'mini_quiz',
  FLASHCARDS: 'cheat_sheet',
};

function isStudyActionId(value: unknown): value is StudyActionId {
  return typeof value === 'string' && studyActions.some((action) => action.id === value);
}

function isStudyArtifactType(value: unknown): value is StudyArtifactType {
  return value === 'translate' || isStudyActionId(value);
}

function getPayloadValue(payload: unknown, key: 'action' | 'title' | 'content'): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  return (payload as Record<string, unknown>)[key];
}

function parseSourceRefs(sourceRefs: unknown): StudySourceRef[] {
  if (!Array.isArray(sourceRefs)) {
    return [];
  }

  return sourceRefs
    .filter((ref): ref is Record<string, unknown> => Boolean(ref) && typeof ref === 'object' && !Array.isArray(ref))
    .map((ref) => {
      const reason: StudySourceRef['reason'] = (
        ref.reason === 'lexical'
        || ref.reason === 'nearby'
        || ref.reason === 'vector'
        || ref.reason === 'hybrid'
      )
        ? ref.reason
        : undefined;

      return {
        lectureId: typeof ref.lectureId === 'string' ? ref.lectureId : '',
        segmentId: typeof ref.segmentId === 'string' ? ref.segmentId : '',
        page: typeof ref.page === 'number' ? ref.page : null,
        slide: typeof ref.slide === 'number' ? ref.slide : null,
        charStart: typeof ref.charStart === 'number' ? ref.charStart : null,
        charEnd: typeof ref.charEnd === 'number' ? ref.charEnd : null,
        label: typeof ref.label === 'string' ? ref.label : 'source',
        score: typeof ref.score === 'number' ? ref.score : undefined,
        reason,
      };
    })
    .filter((ref) => ref.lectureId && ref.segmentId);
}

export function getStudyAction(actionId: StudyActionId): StudyAction {
  return studyActions.find((action) => action.id === actionId)!;
}

export function formatStudyActionTitle(actionId: StudyActionId, segmentCount: number): string {
  const segmentLabel = segmentCount === 1 ? 'source passage' : 'source passages';
  return `${titlePrefixes[actionId]} ${segmentCount} ${segmentLabel}`;
}

export function buildPlaceholderArtifact({
  action,
  segmentTexts,
  sourceRefs,
  relatedTexts = [],
  relatedRefs = [],
}: {
  action: StudyActionId;
  segmentTexts: string[];
  sourceRefs: StudySourceRef[];
  relatedTexts?: string[];
  relatedRefs?: StudySourceRef[];
}): StudyArtifact {
  const selectedText = segmentTexts
    .map((text) => text.trim())
    .filter(Boolean)
    .join(' ');
  const preview = selectedText.length > 320 ? `${selectedText.slice(0, 317)}...` : selectedText;

  const relatedPreview = relatedTexts
    .map((text) => text.trim())
    .filter(Boolean)
    .join(' ');
  const compactRelatedPreview = relatedPreview.length > 220 ? `${relatedPreview.slice(0, 217)}...` : relatedPreview;

  return {
    type: action,
    itemType: getStudyAction(action).itemType,
    title: formatStudyActionTitle(action, sourceRefs.length),
    content: compactRelatedPreview
      ? `${placeholderIntros[action]} ${preview}\n\nRelated context considered: ${compactRelatedPreview}`
      : `${placeholderIntros[action]} ${preview}`,
    sourceRefs,
    relatedRefs,
  };
}

export function mapStoredItemToArtifact(item: StoredStudyItemRow): StudyArtifact {
  const payloadAction = getPayloadValue(item.payloadJson, 'action');
  const action = isStudyArtifactType(payloadAction)
    ? payloadAction
    : itemTypeFallbackAction[item.type];
  const sourceRefs = parseSourceRefs(item.sourceRefs);
  const relatedRefs = parseSourceRefs(item.relatedRefs);
  const payloadTitle = getPayloadValue(item.payloadJson, 'title');
  const payloadContent = getPayloadValue(item.payloadJson, 'content');

  return {
    id: item.id,
    type: action,
    itemType: item.type,
    title: typeof payloadTitle === 'string'
      ? payloadTitle
      : action === 'translate'
        ? `Translation from ${sourceRefs.length} source ${sourceRefs.length === 1 ? 'passage' : 'passages'}`
        : formatStudyActionTitle(action, sourceRefs.length),
    content: typeof payloadContent === 'string'
      ? payloadContent
      : 'Saved study artifact.',
    sourceRefs,
    relatedRefs,
    createdAt: item.createdAt,
  };
}
