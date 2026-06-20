export function normalizeReaderSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim();
}

export function scoreReaderLectureMatch({
  message,
  title,
  originalName,
  courseId,
  folderName,
}: {
  message: string;
  title: string;
  originalName?: string | null;
  courseId?: string | null;
  folderName?: string | null;
}) {
  const normalizedMessage = normalizeReaderSearchText(message);
  const labels = [title, originalName, courseId, folderName]
    .filter(Boolean)
    .map((label) => normalizeReaderSearchText(label || ''))
    .filter(Boolean);

  return labels.reduce((score, label) => {
    if (normalizedMessage.includes(label)) return Math.max(score, 4);
    if (label.split(/\s+/).some((token) => token.length > 2 && normalizedMessage.includes(token))) {
      return Math.max(score, 2);
    }
    return score;
  }, 0);
}
