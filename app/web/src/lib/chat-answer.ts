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

function isAssessmentLikeRequest(message: string) {
  return /\b(midterm|final|exam|mock|practice test|test)\b/i.test(message)
    || /(期中|期末|考试|要考|备考|模拟|测试|卷子|试卷)/i.test(message);
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
    if (isAssessmentLikeRequest(message)) {
      return [
        'Mock midterm draft based on representative coverage from the selected materials.',
        '',
        `Scope: ${question}`,
        '',
        'Part A: Core concepts',
        '1. Define the main concept in your own words, then name the problem it solves.',
        '2. Compare two related ideas from the material and explain when each one is useful.',
        '',
        'Part B: Reading and reasoning',
        '3. Given a short source-style example, identify the rule or definition being used.',
        '4. Explain why a common wrong answer is tempting, then correct it.',
        '',
        'Part C: Application',
        '5. Create a small example that uses the concept correctly.',
        '6. Modify the example so that one assumption changes, then predict the result.',
        '',
        'Answer key:',
        ...(bullets.length > 0
          ? bullets.map((bullet, index) => `- Q${index + 1} anchor: ${bullet}`)
          : [`- Use the source context as the grading anchor: ${context}`]),
        '',
        '代表性覆盖：这份草稿按材料范围组织题型，不是只围绕一两个 passage 出题。',
      ].join('\n');
    }

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
      '心智模型：先抓住它解决的问题，再看它在代码里长什么样，最后用一个小例子验证自己真的懂了。',
      '',
      '第一步：先问“它为什么存在”。如果一个概念反复出现在 lecture 里，通常是因为它解决了某种表达或推理上的麻烦。',
      '',
      '第二步：再看“它怎么工作”。不要急着背定义，先看输入、输出、规则，以及它和前后知识点怎么连起来。',
      '',
      bullets.length > 1
        ? `材料里的下一个关键点是：${bullets[1]}`
        : `你现在的问题是：${question}`,
      '',
      '小例子：把这个概念想成一个可以被传递、命名、组合的工具；学习时先问“它接收什么、输出什么、为什么这样设计”。',
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
