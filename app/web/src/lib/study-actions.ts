export type StudyActionId = 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';

export type StudyAction = {
  id: StudyActionId;
  label: string;
  itemType: 'SUMMARY' | 'GLOSSARY' | 'QUIZ' | 'FLASHCARDS';
};

export type StudySourceRef = {
  lectureId: string;
  segmentId: string;
  page: number | null;
  slide: number | null;
  charStart: number | null;
  charEnd: number | null;
  label: string;
};

export type StudyArtifact = {
  id?: string;
  type: StudyActionId;
  itemType: StudyAction['itemType'];
  title: string;
  content: string;
  sourceRefs: StudySourceRef[];
  createdAt?: string | Date;
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

export function getStudyAction(actionId: StudyActionId): StudyAction {
  return studyActions.find((action) => action.id === actionId)!;
}

export function formatStudyActionTitle(actionId: StudyActionId, segmentCount: number): string {
  const segmentLabel = segmentCount === 1 ? 'source segment' : 'source segments';
  return `${titlePrefixes[actionId]} ${segmentCount} ${segmentLabel}`;
}

export function buildPlaceholderArtifact({
  action,
  segmentTexts,
  sourceRefs,
}: {
  action: StudyActionId;
  segmentTexts: string[];
  sourceRefs: StudySourceRef[];
}): StudyArtifact {
  const selectedText = segmentTexts
    .map((text) => text.trim())
    .filter(Boolean)
    .join(' ');
  const preview = selectedText.length > 320 ? `${selectedText.slice(0, 317)}...` : selectedText;

  return {
    type: action,
    itemType: getStudyAction(action).itemType,
    title: formatStudyActionTitle(action, sourceRefs.length),
    content: `${placeholderIntros[action]} ${preview}`,
    sourceRefs,
  };
}
