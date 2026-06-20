export type LibraryOperationAction = 'upload' | 'delete' | 'rename' | 'move' | 'organize';

export type LibraryOperationDraft = {
  action: LibraryOperationAction;
  targetLabel: string;
  destinationLabel?: string;
  requiresConfirmation: true;
};

function cleanLabel(value: string) {
  return value
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[。.!?？]+$/g, '')
    .replace(/\s*(?:folder|collection|文件夹|资料夹)$/i, '')
    .trim();
}

function pickAction(message: string): LibraryOperationAction {
  if (/\b(upload|add|import)\b|上传|导入|新增文件/i.test(message)) return 'upload';
  if (/\b(delete|remove|trash)\b|删除|移除|删掉/i.test(message)) return 'delete';
  if (/\b(rename)\b|重命名|改名/i.test(message)) return 'rename';
  if (/\b(move|file into|put .* into)\b|移动|归档|放到|放进/i.test(message)) return 'move';
  return 'organize';
}

function extractRenameParts(message: string) {
  const english = message.match(/\brename\s+(.+?)\s+to\s+(.+)$/i);
  if (english) {
    return {
      targetLabel: cleanLabel(english[1]),
      destinationLabel: cleanLabel(english[2]),
    };
  }

  const chinese = message.match(/(?:把|将)?\s*(.+?)\s*(?:重命名|改名)(?:为|成|叫)\s*(.+)$/i);
  if (chinese) {
    return {
      targetLabel: cleanLabel(chinese[1]),
      destinationLabel: cleanLabel(chinese[2]),
    };
  }

  return null;
}

function extractMoveParts(message: string) {
  const english = message.match(/\b(?:move|put)\s+(.+?)\s+(?:to|into)\s+(.+)$/i);
  if (english) {
    return {
      targetLabel: cleanLabel(english[1]),
      destinationLabel: cleanLabel(english[2]),
    };
  }

  const chinese = message.match(/(?:把|将)?\s*(.+?)\s*(?:移动|归档|放到|放进)\s*(?:到|进)?\s*(.+)$/i);
  if (chinese) {
    return {
      targetLabel: cleanLabel(chinese[1]),
      destinationLabel: cleanLabel(chinese[2]),
    };
  }

  return null;
}

function extractTargetLabel(message: string, action: LibraryOperationAction) {
  if (action === 'upload') {
    return 'new source file';
  }

  const quoted = message.match(/["'`]([^"'`]+)["'`]/);
  if (quoted) {
    return cleanLabel(quoted[1]);
  }

  const fileLike = message.match(/([^\s，。,.!?？]+?\.(?:pdf|txt|pptx|md|docx))/i);
  if (fileLike) {
    return cleanLabel(fileLike[1]);
  }

  const withoutAction = message
    .replace(/\b(delete|remove|trash|rename|move|file|folder|library)\b/gi, ' ')
    .replace(/删除|移除|删掉|重命名|改名|移动|归档|文件|文件夹|资料库|这个|那个/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanLabel(withoutAction) || 'selected Library item';
}

export function inferLibraryOperationDraft(message: string): LibraryOperationDraft {
  const action = pickAction(message);
  const renameParts = action === 'rename' ? extractRenameParts(message) : null;
  const moveParts = action === 'move' ? extractMoveParts(message) : null;

  return {
    action,
    targetLabel: renameParts?.targetLabel || moveParts?.targetLabel || extractTargetLabel(message, action),
    destinationLabel: renameParts?.destinationLabel || moveParts?.destinationLabel,
    requiresConfirmation: true,
  };
}
