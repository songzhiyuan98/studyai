'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type ActionMode = 'free' | 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';

type ChatSource = {
  id: string;
  label: string;
  detail: string;
  vectorStatus?: string;
  segments: number;
};

type SourceRef = {
  lectureId: string;
  segmentId: string;
  label: string;
  page: number | null;
  slide: number | null;
  charStart?: number | null;
  charEnd?: number | null;
  score?: number;
  reason?: 'lexical' | 'nearby' | 'vector' | 'hybrid';
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  sessionId?: string;
  title?: string;
  content: string;
  sourceRefs?: SourceRef[];
  retrieval?: {
    strategy: string;
    contextStrategy?: 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';
    plannerSource?: 'deterministic' | 'ai_planner';
    plannerModel?: string;
    plannerRationale?: string;
    count: number;
    scopedLectureCount?: number;
    generation?: {
      provider: string;
      model: string;
    };
  };
  mode?: ActionMode;
  savedId?: string;
  isStreaming?: boolean;
};

type SourcePreviewMaterial = {
  lectureId: string;
  title: string;
  detail: string;
  count: number;
};

type SourcePreview = {
  materials: SourcePreviewMaterial[];
  sourceRefs: SourceRef[];
  retrieval: {
    strategy: string;
    contextStrategy?: 'focused_rag' | 'broad_rag' | 'lecture_pack' | 'long_document_map';
    plannerSource?: 'deterministic' | 'ai_planner';
    plannerModel?: string;
    plannerRationale?: string;
    count: number;
    scopedLectureCount: number;
    sourceScope?: 'selected_sources' | 'folder' | 'course' | 'lecture_title' | 'all_ready' | 'none';
    libraryScope?: {
      source: 'selected_sources' | 'folder' | 'course' | 'lecture_title' | 'all_ready' | 'none';
      confidence: 'high' | 'medium' | 'low';
      needsConfirmation: boolean;
      reason: string;
      matchedLabels: string[];
      narrowed: boolean;
    };
  };
};

type ChatStreamEvent =
  | { event: 'metadata'; data: { message: Partial<ChatMessage> } }
  | { event: 'delta'; data: { delta: string } }
  | { event: 'done'; data: { message: ChatMessage } };

const actionModes: Array<{ id: ActionMode; label: string; hint: string }> = [
  { id: 'free', label: 'Ask freely', hint: 'Natural study chat' },
  { id: 'explain', label: 'Explain', hint: 'Clarify hard parts' },
  { id: 'summarize', label: 'Summarize', hint: 'Condense selected scope' },
  { id: 'key_terms', label: 'Key terms', hint: 'Extract vocabulary' },
  { id: 'mini_quiz', label: 'Mini quiz', hint: 'Practice questions' },
  { id: 'cheat_sheet', label: 'Cheat sheet', hint: 'Printable draft' },
];

function hasStudySignalForAutoScope(text: string) {
  return /\b(study|learn|review|explain|teach|understand|quiz|test|exam|midterm|final|homework|assignment|lecture|slide|chapter|page|pdf|txt|notes?|sources?|materials?|haskell|lambda|functions?|types?|syntax|code|programming|definitions?|concepts?|terms?|examples?)\b/i.test(text)
    || /(学习|复习|教我|带我|讲讲|详细讲|学会|考试|要考|备考|测验|测试|题目|作业|文件|材料|来源|第\s*\d+\s*页|每一页|逐页|概念|例子|代码|语法)/i.test(text);
}

function shouldPreviewSourceScopeBeforeSend(preview: SourcePreview) {
  return preview.materials.length > 1
    || preview.retrieval.contextStrategy === 'lecture_pack'
    || preview.retrieval.contextStrategy === 'long_document_map'
    || preview.retrieval.strategy.startsWith('broad_');
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${keyPrefix}-code-${index}`}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-strong-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
}

function formatAssistantContent(content: string) {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let orderedListItems: string[] = [];
  let codeLines: string[] | null = null;
  let codeLanguage = '';

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(' ');
    elements.push(
      <p key={`p-${elements.length}`}>
        {renderInlineMarkdown(text, `p-${elements.length}`)}
      </p>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`}>
          {listItems.map((item, index) => (
            <li key={`li-${index}`}>{renderInlineMarkdown(item, `li-${elements.length}-${index}`)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }

    if (orderedListItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`}>
          {orderedListItems.map((item, index) => (
            <li key={`oli-${index}`}>{renderInlineMarkdown(item, `oli-${elements.length}-${index}`)}</li>
          ))}
        </ol>,
      );
      orderedListItems = [];
    }
  };

  const flushTextBlocks = () => {
    flushParagraph();
    flushList();
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      if (codeLines) {
        elements.push(
          <pre key={`code-${elements.length}`}>
            {codeLanguage ? <span>{codeLanguage}</span> : null}
            <code>{codeLines.join('\n')}</code>
          </pre>,
        );
        codeLines = null;
        codeLanguage = '';
        return;
      }

      flushTextBlocks();
      codeLines = [];
      codeLanguage = line.replace(/^```/, '').trim();
      return;
    }

    if (codeLines) {
      codeLines.push(rawLine);
      return;
    }

    if (!line.trim()) {
      flushTextBlocks();
      return;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushTextBlocks();
      elements.push(
        <h3 key={`h-${elements.length}`}>
          {renderInlineMarkdown(heading[2], `h-${elements.length}`)}
        </h3>,
      );
      return;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      orderedListItems = [];
      listItems.push(bullet[1]);
      return;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      listItems = [];
      orderedListItems.push(ordered[1]);
      return;
    }

    paragraphLines.push(line.trim());
  });

  if (codeLines) {
    elements.push(
      <pre key={`code-${elements.length}`}>
        {codeLanguage ? <span>{codeLanguage}</span> : null}
        <code>{codeLines.join('\n')}</code>
      </pre>,
    );
  }
  flushTextBlocks();

  return elements;
}

function parseChatStreamEvent(rawEvent: string): ChatStreamEvent | null {
  const lines = rawEvent.split('\n').filter(Boolean);
  const eventLine = lines.find((line) => line.startsWith('event:'));
  const dataLine = lines.find((line) => line.startsWith('data:'));

  if (!eventLine || !dataLine) {
    return null;
  }

  return {
    event: eventLine.replace(/^event:\s*/, '') as ChatStreamEvent['event'],
    data: JSON.parse(dataLine.replace(/^data:\s*/, '')),
  } as ChatStreamEvent;
}

function getUsedMaterials(sourceRefs: SourceRef[]) {
  const materials = new Map<string, {
    lectureId: string;
    title: string;
    firstSegmentId: string;
    count: number;
  }>();

  sourceRefs.forEach((source) => {
    const existing = materials.get(source.lectureId);
    const title = source.label.split(' · ')[0] || 'Source';

    if (existing) {
      existing.count += 1;
      return;
    }

    materials.set(source.lectureId, {
      lectureId: source.lectureId,
      title,
      firstSegmentId: source.segmentId,
      count: 1,
    });
  });

  return Array.from(materials.values());
}

function shouldShowMessageTitle(chatMessage: ChatMessage) {
  return Boolean(chatMessage.title && chatMessage.title !== 'Study answer');
}

function isLibraryActionMessage(chatMessage: ChatMessage) {
  return chatMessage.retrieval?.strategy === 'tool_library_manage_v0';
}

function isArtifactSaveMessage(chatMessage: ChatMessage) {
  return chatMessage.retrieval?.strategy === 'tool_artifact_save_v0';
}

function shouldShowSourceRefs(chatMessage: ChatMessage) {
  return Boolean(chatMessage.content.trim() && chatMessage.sourceRefs?.length && !isArtifactSaveMessage(chatMessage));
}

function getContextStrategyLabel(strategy?: NonNullable<ChatMessage['retrieval']>['contextStrategy']) {
  if (strategy === 'lecture_pack') {
    return 'lesson context';
  }

  if (strategy === 'long_document_map') {
    return 'document map';
  }

  if (strategy === 'broad_rag') {
    return 'scope coverage';
  }

  if (strategy === 'focused_rag') {
    return 'focused context';
  }

  return 'source grounded';
}

function getPlannerSourceLabel(source?: NonNullable<ChatMessage['retrieval']>['plannerSource']) {
  if (source === 'ai_planner') {
    return 'AI selected';
  }

  if (source === 'deterministic') {
    return 'Auto selected';
  }

  return 'Auto scope';
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const requestedSessionId = searchParams.get('sessionId');
  const chatScrollRef = useRef<HTMLElement>(null);
  const composerFormRef = useRef<HTMLFormElement>(null);
  const hasHydratedSourcesRef = useRef(false);
  const mountedRef = useRef(true);
  const [mode, setMode] = useState<ActionMode>('free');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [confirmedSources, setConfirmedSources] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [showSourceScope, setShowSourceScope] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [selectedPreviewLectureIds, setSelectedPreviewLectureIds] = useState<string[]>([]);
  const [previewingSources, setPreviewingSources] = useState(false);
  const [error, setError] = useState('');

  const selectedMode = useMemo(
    () => actionModes.find((action) => action.id === mode) || actionModes[0],
    [mode],
  );
  const hasStreamingAssistant = messages.some((chatMessage) => chatMessage.role === 'assistant' && chatMessage.isStreaming);
  const sourceLabel = confirmedSources.length === 0
    ? 'Auto scope'
    : `${confirmedSources.length} ${confirmedSources.length === 1 ? 'source' : 'sources'}`;
  const isSourceRangePreview = Boolean(
    sourcePreview?.retrieval.strategy.startsWith('broad_')
      || sourcePreview?.retrieval.contextStrategy === 'lecture_pack'
      || sourcePreview?.retrieval.contextStrategy === 'long_document_map',
  );
  const isLecturePackPreview = sourcePreview?.retrieval.contextStrategy === 'lecture_pack';
  const sourcePreviewChunkLabel = isSourceRangePreview
    ? 'coverage samples'
    : 'relevant passages';
  const sourcePreviewGroundingLabel = isLecturePackPreview
    ? 'lecture order'
    : sourcePreview?.retrieval.contextStrategy === 'long_document_map'
      ? 'document map coverage'
      : isSourceRangePreview
        ? 'scope coverage'
        : 'focused context';
  const sourceScopeLabel = sourcePreview?.retrieval.libraryScope?.matchedLabels?.length
    ? sourcePreview.retrieval.libraryScope.matchedLabels.join(', ')
    : sourcePreview?.retrieval.sourceScope === 'selected_sources'
      ? 'Selected sources'
      : sourcePreview?.retrieval.sourceScope === 'lecture_title'
        ? 'Matching lecture'
        : sourcePreview?.retrieval.sourceScope === 'all_ready'
          ? 'All ready materials'
          : 'Auto scope';
  const sourcePreviewTitle = isSourceRangePreview ? 'Suggested study scope' : 'Suggested materials';
  const sourcePreviewDescription = isSourceRangePreview
    ? `${sourceScopeLabel} · ${sourcePreview?.materials.length || 0} ${(sourcePreview?.materials.length || 0) === 1 ? 'material' : 'materials'} in scope · ${sourcePreviewGroundingLabel} · ${getPlannerSourceLabel(sourcePreview?.retrieval.plannerSource)}`
    : `${sourceScopeLabel} · ${sourcePreview?.materials.length || 0} likely ${(sourcePreview?.materials.length || 0) === 1 ? 'material' : 'materials'} · ${sourcePreview?.retrieval.count || 0} ${sourcePreviewChunkLabel} · ${getPlannerSourceLabel(sourcePreview?.retrieval.plannerSource)}`;
  const sourcePreviewReason = sourcePreview?.retrieval.plannerRationale
    || sourcePreview?.retrieval.libraryScope?.reason
    || '';

  const loadSources = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoadingSources(true);
    }
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load chat sources.');
      }

      if (!mountedRef.current) return;

      const loadedSources = payload.data.sources as ChatSource[];
      const loadedIds = new Set(loadedSources.map((source) => source.id));

      setSources(loadedSources);
      setConfirmedSources((current) => {
        if (!hasHydratedSourcesRef.current) {
          return [];
        }

        return current.filter((sourceId) => loadedIds.has(sourceId));
      });
      hasHydratedSourcesRef.current = true;
    } catch (loadError) {
      if (!mountedRef.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Failed to load chat sources.');
    } finally {
      if (mountedRef.current && !silent) {
        setLoadingSources(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadSources();

    return () => {
      mountedRef.current = false;
    };
  }, [loadSources]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        loadSources({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', refreshOnFocus);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadSources]);

  useEffect(() => {
    const scrollElement = chatScrollRef.current;
    if (!scrollElement) return;

    scrollElement.scrollTo({
      top: scrollElement.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  useEffect(() => {
    if (!requestedSessionId) {
      setActiveSessionId(null);
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadChatSession = async () => {
      setError('');

      try {
        const response = await fetch(`/api/chat/sessions/${requestedSessionId}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to load chat session.');
        }

        if (cancelled) return;

        setActiveSessionId(payload.data.session.id);
        setMessages(payload.data.session.messages || []);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load chat session.');
      }
    };

    loadChatSession();

    return () => {
      cancelled = true;
    };
  }, [requestedSessionId]);

  const toggleSource = (sourceId: string) => {
    setConfirmedSources((current) => (
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId]
    ));
  };

  const selectAllSources = () => {
    setConfirmedSources(sources.map((source) => source.id));
  };

  const clearSources = () => {
    setConfirmedSources([]);
    setSourcePreview(null);
    setSelectedPreviewLectureIds([]);
  };

  const requestSourcePreview = async (trimmedMessage: string, lectureIds: string[]) => {
    const response = await fetch('/api/chat/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        message: trimmedMessage,
        mode,
        lectureIds,
      }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Could not preview source context.');
    }

    return payload.data as SourcePreview;
  };

  const showSourcePreview = (nextPreview: SourcePreview) => {
    setSourcePreview(nextPreview);
    setSelectedPreviewLectureIds(nextPreview.materials.map((material) => material.lectureId));
  };

  const previewSources = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || previewingSources || sending) return;

    setPreviewingSources(true);
    setError('');

    try {
      showSourcePreview(await requestSourcePreview(trimmedMessage, confirmedSources));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Could not preview source context.');
    } finally {
      setPreviewingSources(false);
    }
  };

  const togglePreviewMaterial = (lectureId: string) => {
    setSelectedPreviewLectureIds((current) => (
      current.includes(lectureId)
        ? current.filter((id) => id !== lectureId)
        : [...current, lectureId]
    ));
  };

  const selectAllPreviewMaterials = () => {
    setSelectedPreviewLectureIds(sourcePreview?.materials.map((material) => material.lectureId) || []);
  };

  const clearPreviewMaterials = () => {
    setSelectedPreviewLectureIds([]);
  };

  const usePreviewMaterials = () => {
    if (!sourcePreview?.materials.length || selectedPreviewLectureIds.length === 0) return;

    setConfirmedSources(selectedPreviewLectureIds);
    setSourcePreview(null);
    setSelectedPreviewLectureIds([]);
    setShowSourceScope(false);
  };

  const updateDraftMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    if (sourcePreview) {
      setSourcePreview(null);
      setSelectedPreviewLectureIds([]);
    }
  };

  const submitCurrentMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending || previewingSources) {
      return;
    }

    const shouldConfirmSourcesBeforeSend = confirmedSources.length === 0
      && !sourcePreview
      && (mode !== 'free' || hasStudySignalForAutoScope(trimmedMessage));
    if (shouldConfirmSourcesBeforeSend) {
      setPreviewingSources(true);
      setError('');

      try {
        const autoPreview = await requestSourcePreview(trimmedMessage, []);
        if (shouldPreviewSourceScopeBeforeSend(autoPreview)) {
          showSourcePreview(autoPreview);
          return;
        }
      } catch (previewError) {
        setError(previewError instanceof Error ? previewError.message : 'Could not preview source context.');
        return;
      } finally {
        setPreviewingSources(false);
      }
    }

    const lectureIdsForMessage = sourcePreview?.materials.length && selectedPreviewLectureIds.length > 0
      ? selectedPreviewLectureIds
      : confirmedSources;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setSourcePreview(null);
    setSelectedPreviewLectureIds([]);
    setShowSourceScope(false);
    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          mode,
          lectureIds: lectureIdsForMessage,
          sessionId: activeSessionId || undefined,
          stream: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to generate a grounded response.');
      }

      const assistantId = `assistant-${Date.now()}`;

      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
        const payload = await response.json();

        if (!payload.success) {
          throw new Error(payload.error || 'Failed to generate a grounded response.');
        }

        setMessages((current) => [
          ...current,
          {
            ...payload.data.message,
            id: assistantId,
            mode,
            isStreaming: false,
          },
        ]);
        if (payload.data.message.sessionId) {
          setActiveSessionId(payload.data.message.sessionId);
          window.dispatchEvent(new Event('studyflow:chat-sessions-changed'));
        }
        return;
      }

      let assistantStarted = false;
      let streamBuffer = '';
      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const rawEvents = streamBuffer.split('\n\n');
        streamBuffer = rawEvents.pop() || '';

        for (const rawEvent of rawEvents) {
          const streamEvent = parseChatStreamEvent(rawEvent);
          if (!streamEvent) continue;

          if (streamEvent.event === 'metadata') {
            if (streamEvent.data.message.sessionId) {
              setActiveSessionId(streamEvent.data.message.sessionId);
            }
            assistantStarted = true;
            setMessages((current) => [
              ...current,
              {
                id: assistantId,
                role: 'assistant',
                sessionId: streamEvent.data.message.sessionId,
                title: streamEvent.data.message.title,
                content: '',
                sourceRefs: streamEvent.data.message.sourceRefs,
                retrieval: streamEvent.data.message.retrieval,
                mode,
                isStreaming: true,
              },
            ]);
          }

          if (streamEvent.event === 'delta') {
            if (!assistantStarted) {
              assistantStarted = true;
              setMessages((current) => [
                ...current,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: '',
                  mode,
                  isStreaming: true,
                },
              ]);
            }

            setMessages((current) => current.map((item) => (
              item.id === assistantId
                ? { ...item, content: `${item.content}${streamEvent.data.delta}` }
                : item
            )));
          }

          if (streamEvent.event === 'done') {
            if (streamEvent.data.message.sessionId) {
              setActiveSessionId(streamEvent.data.message.sessionId);
              window.dispatchEvent(new Event('studyflow:chat-sessions-changed'));
            }
            setMessages((current) => current.map((item) => (
              item.id === assistantId
                ? {
                    ...streamEvent.data.message,
                    id: assistantId,
                    mode,
                    isStreaming: false,
                  }
                : item
            )));
          }
        }
      }

      if (streamBuffer.trim()) {
        const streamEvent = parseChatStreamEvent(streamBuffer);
        if (streamEvent?.event === 'done') {
          if (streamEvent.data.message.sessionId) {
            setActiveSessionId(streamEvent.data.message.sessionId);
            window.dispatchEvent(new Event('studyflow:chat-sessions-changed'));
          }
          setMessages((current) => current.map((item) => (
            item.id === assistantId
              ? {
                  ...streamEvent.data.message,
                  id: assistantId,
                  mode,
                  isStreaming: false,
                }
              : item
          )));
        }
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to generate a grounded response.');
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          title: 'Could not answer',
          content: 'I could not generate a response from your library right now. Please try again in a moment.',
          sourceRefs: [],
          mode,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void submitCurrentMessage();
  };

  const saveAssistantMessage = async (chatMessage: ChatMessage) => {
    if (chatMessage.role !== 'assistant' || !chatMessage.sourceRefs?.length || chatMessage.savedId || savingMessageId) {
      return;
    }

    setSavingMessageId(chatMessage.id);
    setError('');

    try {
      const response = await fetch('/api/chat/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          mode: chatMessage.mode || mode,
          title: chatMessage.title || actionModes.find((action) => action.id === chatMessage.mode)?.label || selectedMode.label,
          content: chatMessage.content,
          sourceRefs: chatMessage.sourceRefs,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save this output.');
      }

      setMessages((current) => current.map((item) => (
        item.id === chatMessage.id
          ? { ...item, savedId: payload.data.artifact.id || 'saved' }
          : item
      )));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save this output.');
    } finally {
      setSavingMessageId(null);
    }
  };

  return (
    <div className="chat-app-shell">
      <main className="chat-main">
        <section ref={chatScrollRef} className="chat-scroll">
          <div className="chat-welcome">
            <div className="mb-5 flex justify-center">
              <span className="ai-pill">
                <span className="flex gap-1">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </span>
                Library-grounded AI
              </span>
            </div>
            <h2>What do you want to study today?</h2>
            <p>
              Ask freely or choose a quick action. StudyFlow will organize the right Library context and keep citations attached.
            </p>
          </div>

          {messages.map((chatMessage) => (
            <div
              key={chatMessage.id}
              className={chatMessage.role === 'user' ? 'chat-turn chat-turn-user' : 'chat-turn chat-turn-assistant'}
            >
              {chatMessage.role === 'assistant' ? <div className="chat-avatar">S</div> : null}
              <div className={chatMessage.role === 'user' ? 'chat-turn-body' : 'chat-turn-content'}>
                {shouldShowMessageTitle(chatMessage) ? (
                  <p className="mb-2 text-sm font-medium text-[#000000]">{chatMessage.title}</p>
                ) : null}
                {chatMessage.role === 'assistant' ? (
                  <div className="chat-markdown">
                    {chatMessage.isStreaming && !chatMessage.content.trim() ? (
                      <p><span className="chat-thinking-text">Thinking...</span></p>
                    ) : (
                      formatAssistantContent(chatMessage.content)
                    )}
                    {chatMessage.isStreaming ? <span className="chat-typing-cursor" aria-hidden="true" /> : null}
                  </div>
                ) : (
                  <p>{chatMessage.content}</p>
                )}

                {!chatMessage.isStreaming && shouldShowSourceRefs(chatMessage) ? (
                  <>
                    <div className="chat-used-sources">
                      <p>
                        Used materials · {getContextStrategyLabel(chatMessage.retrieval?.contextStrategy)} · {getPlannerSourceLabel(chatMessage.retrieval?.plannerSource)}
                      </p>
                      <div>
                        {getUsedMaterials(chatMessage.sourceRefs).map((material) => (
                          <Link
                            key={material.lectureId}
                            href={`/documents/${material.lectureId}?segmentId=${encodeURIComponent(material.firstSegmentId)}`}
                            className="chat-used-source-pill"
                          >
                            <span>{material.title}</span>
                            <span>{material.count} passages</span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="chat-citation-row">
                      {chatMessage.sourceRefs.map((source) => (
                        <Link
                          key={`${source.lectureId}-${source.segmentId}`}
                          href={`/documents/${source.lectureId}?segmentId=${encodeURIComponent(source.segmentId)}`}
                          className="status-pill status-muted"
                        >
                          {source.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}

                {chatMessage.role === 'assistant' && !chatMessage.isStreaming && shouldShowSourceRefs(chatMessage) ? (
                  <div className="chat-message-actions">
                    <button
                      type="button"
                      onClick={() => saveAssistantMessage(chatMessage)}
                      disabled={Boolean(chatMessage.savedId) || savingMessageId === chatMessage.id || chatMessage.isStreaming}
                      className="chat-message-action"
                    >
                      {chatMessage.savedId
                        ? 'Saved'
                        : savingMessageId === chatMessage.id
                          ? 'Saving...'
                          : chatMessage.isStreaming
                            ? 'Writing...'
                          : 'Save output'}
                    </button>
                    <Link href="/saved" className="chat-message-action">
                      Saved
                    </Link>
                  </div>
                ) : null}

                {chatMessage.role === 'assistant' && !chatMessage.isStreaming && isArtifactSaveMessage(chatMessage) ? (
                  <div className="chat-message-actions">
                    <Link href="/saved" className="chat-message-action">
                      Open Saved
                    </Link>
                  </div>
                ) : null}

                {chatMessage.role === 'assistant' && !chatMessage.isStreaming && isLibraryActionMessage(chatMessage) ? (
                  <div className="chat-message-actions">
                    <Link href="/library" className="chat-message-action">
                      Open Library
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {sending && !hasStreamingAssistant ? (
            <div className="chat-turn chat-turn-assistant">
              <div className="chat-avatar">S</div>
              <div className="chat-turn-content">
                <span className="ai-pill">
                  <span className="flex gap-1">
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                  </span>
                  Looking through your materials
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <form ref={composerFormRef} className="chat-composer-dock" onSubmit={sendMessage}>
          <div className="chat-floating-composer">
            <div className="chat-action-strip" aria-label="Quick study actions">
              {actionModes.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setMode(action.id)}
                  className={mode === action.id ? 'chat-action-pill chat-action-pill-active' : 'chat-action-pill'}
                  title={action.hint}
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div className="chat-scope-line">
              <span>{confirmedSources.length === 0 ? 'Using auto source search' : `Using ${sourceLabel}`}</span>
              <button type="button" onClick={() => setShowSourceScope((current) => !current)}>
                {showSourceScope ? 'Hide sources' : 'Choose sources'}
              </button>
            </div>

            {error ? (
              <div className="chat-error-panel">
                {error}
              </div>
            ) : null}

            {showSourceScope ? (
              <div className="chat-source-picker">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p>Source range</p>
                    <span>
                      {confirmedSources.length === 0
                        ? 'I will search all ready Library materials and cite what I use.'
                        : 'Only selected materials will be searched for the next answer.'}
                    </span>
                  </div>
                  <div className="chat-source-tools">
                    <button type="button" onClick={() => loadSources()} className="chat-message-action">
                      Refresh
                    </button>
                    <button type="button" onClick={selectAllSources} disabled={sources.length === 0} className="chat-message-action">
                      Lock all
                    </button>
                    <button type="button" onClick={clearSources} className="chat-message-action">
                      Auto
                    </button>
                  </div>
                </div>
                <div className="mt-3 divide-y divide-[#e5e5e5]">
                  {loadingSources ? (
                    <div className="space-y-2 py-2">
                      <div className="h-4 w-2/3 rounded bg-[#f2f2f2]" />
                      <div className="h-4 w-1/2 rounded bg-[#f2f2f2]" />
                    </div>
                  ) : sources.length > 0 ? (
                    sources.map((source) => {
                      const active = confirmedSources.includes(source.id);

                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => toggleSource(source.id)}
                          className="chat-source-row"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-[#000000]">{source.label}</span>
                            <span className="mt-1 block truncate text-xs text-[#737373]">{source.detail}</span>
                          </span>
                          <span className={active ? 'status-pill status-ready' : 'status-pill'}>
                            {active ? 'Use' : 'Skip'}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-4 text-sm leading-6 text-[#737373]">
                      No ready sources yet. Go to{' '}
                      <Link href="/library" className="text-link">
                        Library
                      </Link>{' '}
                      and upload a PDF or TXT file first.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {sourcePreview ? (
              <div className="chat-source-preview">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p>{sourcePreviewTitle}</p>
                    <span>
                      {sourcePreviewDescription}
                      {sourcePreview.materials.length > 0 ? ` · ${selectedPreviewLectureIds.length} selected` : ''}
                    </span>
                    {sourcePreviewReason ? (
                      <span className="mt-2 block">
                        Why this scope · {sourcePreviewReason}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={usePreviewMaterials} disabled={selectedPreviewLectureIds.length === 0} className="chat-message-action">
                      Use selected
                    </button>
                    <button type="button" onClick={selectAllPreviewMaterials} className="chat-message-action">
                      Select all
                    </button>
                    <button type="button" onClick={clearPreviewMaterials} className="chat-message-action">
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourcePreview(null);
                        setSelectedPreviewLectureIds([]);
                      }}
                      className="chat-message-action"
                    >
                      Hide
                    </button>
                  </div>
                </div>
                <div className="chat-source-preview-list">
                  {sourcePreview.materials.length > 0 ? (
                    sourcePreview.materials.map((material) => {
                      const selected = selectedPreviewLectureIds.includes(material.lectureId);

                      return (
                        <button
                          key={material.lectureId}
                          type="button"
                          onClick={() => togglePreviewMaterial(material.lectureId)}
                          className={selected ? 'chat-source-preview-item chat-source-preview-item-selected' : 'chat-source-preview-item'}
                        >
                          <span className="chat-source-preview-check" aria-hidden="true">
                            {selected ? '✓' : ''}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">{material.title}</span>
                            <span>
                              {isSourceRangePreview
                                ? `Ready material · ${material.detail} · ${material.count} indexed passages`
                                : `${material.count} ${sourcePreviewChunkLabel} · ${material.detail}`}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-[#737373]">No ready matching sources yet.</span>
                  )}
                </div>
              </div>
            ) : null}

            <div className="chat-input-shell">
              <textarea
                value={message}
                onChange={(event) => updateDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) {
                    return;
                  }

                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    composerFormRef.current?.requestSubmit();
                  }
                }}
                className="chat-input"
                rows={1}
                placeholder={`Message StudyFlow · ${selectedMode.hint}`}
              />
              <div className="chat-composer-footer">
                <span>{selectedMode.label} · {sourceLabel}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={previewSources}
                    className="chat-preview-button"
                    disabled={!message.trim() || previewingSources || sending}
                  >
                    {previewingSources ? 'Checking...' : 'Check sources'}
                  </button>
                  <button type="submit" className="chat-send-button" disabled={!message.trim() || sending} aria-label="Send message">
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
