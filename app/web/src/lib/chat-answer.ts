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

function isTeacherLikeRequest(message: string) {
  return /(\bteach\b|\blearn\b|\breview\b|\bfrom scratch\b|\bbeginner\b|\bwalk me through\b|\beach page\b|学习|复习|带我|教我|学会|从头|小白|没接触过|每一页|逐页|详细讲|讲讲|听你的安排)/i.test(message);
}

export function buildCasualChatAnswer({ message }: { message: string }): string {
  const normalized = message.trim().toLowerCase();

  if (/^(hi|hello|hey|yo|你好|嗨)\b/.test(normalized)) {
    return "Hi, I'm here. We can chat normally, and when you want to study I can pull in your Library sources.";
  }

  if (/\b(thanks|thank you|谢谢)\b/.test(normalized)) {
    return "Of course. When you're ready, tell me what you want to study next.";
  }

  return "I can help with that. If you want to connect it to your course materials, mention the topic, lecture, or file and I'll bring the right sources in.";
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

  if (isTeacherLikeRequest(message)) {
    return [
      '我们先把这个东西放到一张地图里理解。',
      '',
      `为什么要学它：${bullets.length > 0 ? bullets[0] : context}`,
      '',
      '怎么理解：先抓住它解决的问题，再看它在代码里长什么样，最后用一个小例子验证自己真的懂了。',
      '',
      bullets.length > 1
        ? `材料里的下一个关键点是：${bullets[1]}`
        : `你现在的问题是：${question}`,
      '',
      '小练习：你能用一句话说出这个概念是为了解决什么问题吗？',
    ].join('\n');
  }

  return [
    "Let's start with the core idea.",
    '',
    bullets.length > 0 ? bullets[0] : context,
    '',
    bullets.length > 1
      ? `A useful next detail is this: ${bullets[1]}`
      : `For your question, the important part is: ${question}`,
    '',
    'What part should we unpack next?',
  ].join('\n');
}
