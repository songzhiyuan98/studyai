export type ChatMode = 'free' | 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';

export const chatModeLabels: Record<ChatMode, string> = {
  free: 'Study answer',
  explain: 'Explanation',
  summarize: 'Summary',
  key_terms: 'Key terms',
  mini_quiz: 'Mini quiz',
  cheat_sheet: 'Cheat sheet draft',
};

function compactQuestion(message: string): string {
  const trimmed = message.trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
}

function extractKeyTerms(contextText: string): string[] {
  return Array.from(new Set(contextText.match(/[A-Za-z][A-Za-z0-9_-]{3,}/g) || []))
    .filter((term) => !['This', 'That', 'What', 'Which', 'Source'].includes(term))
    .slice(0, 10);
}

function bulletizeContext(contextText: string, limit = 4): string[] {
  return contextText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
    .slice(0, limit);
}

export function buildChatAnswer({
  mode,
  message,
  contextText,
}: {
  mode: ChatMode;
  message: string;
  contextText: string;
}): string {
  const question = compactQuestion(message);
  const context = contextText.trim() || 'No matching context was found.';
  const bullets = bulletizeContext(context);

  if (mode === 'mini_quiz') {
    return [
      'Here is a short practice quiz grounded in the retrieved source context.',
      '',
      `Scope: ${question}`,
      '',
      '1. Concept check: What is the main idea behind the retrieved source passage?',
      '2. Evidence check: Which cited source detail supports that idea most directly?',
      '3. Application: Create a small example that uses the same idea.',
      '4. Reflection: What would be a common mistake when applying it?',
      '',
      `Source notes considered: ${context}`,
    ].join('\n');
  }

  if (mode === 'key_terms') {
    const terms = extractKeyTerms(context);

    return [
      'Here are the key terms that look most relevant to your question.',
      '',
      terms.length > 0 ? terms.map((term) => `- ${term}`).join('\n') : '- No strong terms found yet.',
      '',
      `Use these as anchors while reviewing: ${context}`,
    ].join('\n');
  }

  if (mode === 'cheat_sheet') {
    return [
      'Here is a printable cheat-sheet outline grounded in the retrieved source context.',
      '',
      `Topic: ${question}`,
      '',
      'Must know:',
      ...(bullets.length > 0 ? bullets.map((bullet) => `- ${bullet}`) : [`- ${context}`]),
      '',
      'Quick recall prompts:',
      '- Define the core concept in one sentence.',
      '- Write one example from memory.',
      '- Mark the source citation next to any bullet you plan to print.',
    ].join('\n');
  }

  if (mode === 'summarize') {
    return [
      'Here is a compact summary of the retrieved lecture context.',
      '',
      ...(bullets.length > 0 ? bullets.map((bullet) => `- ${bullet}`) : [`- ${context}`]),
      '',
      `Original question: ${question}`,
    ].join('\n');
  }

  if (mode === 'explain') {
    return [
      'Here is a clearer explanation based on your library context.',
      '',
      `Question: ${question}`,
      '',
      `The source context suggests this idea: ${context}`,
      '',
      'How to study it: identify the definition, trace one example, then test yourself by explaining why the example works.',
    ].join('\n');
  }

  return [
    'Here is a grounded study response based on your library context.',
    '',
    `Question: ${question}`,
    '',
    `Answer from retrieved context: ${context}`,
    '',
    'Next step: ask for an explanation, mini quiz, or cheat sheet if you want to turn this into practice.',
  ].join('\n');
}
