'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type ActionMode = 'free' | 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';

type ChatSource = {
  id: string;
  label: string;
  detail: string;
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

function formatAssistantContent(content: string) {
  return content.split('\n').map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < content.split('\n').length - 1 ? <br /> : null}
    </span>
  ));
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

export default function ChatPage() {
  const searchParams = useSearchParams();
  const requestedSessionId = searchParams.get('sessionId');
  const chatScrollRef = useRef<HTMLElement>(null);
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
  const [error, setError] = useState('');

  const selectedMode = useMemo(
    () => actionModes.find((action) => action.id === mode) || actionModes[0],
    [mode],
  );
  const sourceLabel = confirmedSources.length === 0
    ? 'All ready sources'
    : `${confirmedSources.length} ${confirmedSources.length === 1 ? 'source' : 'sources'}`;

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
          return loadedSources.slice(0, 3).map((source) => source.id);
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
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setMessage('');
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
          lectureIds: confirmedSources,
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
              Ask freely or choose a quick action. StudyFlow will retrieve from your ready Library sources and keep citations attached.
            </p>
          </div>

          <div className="chat-turn chat-turn-assistant">
            <div className="chat-avatar">S</div>
            <div className="chat-turn-content">
              <div className="chat-source-card chat-source-card-compact">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#000000]">Source scope</p>
                    <p className="mt-1 text-xs text-[#737373]">
                      {confirmedSources.length === 0
                        ? 'Searching all ready Library sources.'
                        : `Searching ${sourceLabel} from your Library.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSourceScope((current) => !current)}
                    className="chat-source-toggle"
                  >
                    {loadingSources ? 'Loading sources' : sourceLabel}
                    <span>{showSourceScope ? 'Hide' : 'Edit'}</span>
                  </button>
                </div>

                {error ? (
                  <div className="mt-4 border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {showSourceScope ? (
                  <>
                    <div className="mt-4 ai-terminal">
                      <div className="ai-terminal-lights">
                        <span className="bg-[#ff5f56]" />
                        <span className="bg-[#ffbd2e]" />
                        <span className="bg-[#27c93f]" />
                      </div>
                      <div>retrieval: embedding when available, lexical fallback</div>
                      <div>mode: {selectedMode.label}</div>
                      <div>scope: {confirmedSources.length > 0 ? `${confirmedSources.length} selected` : 'all ready sources'}</div>
                    </div>
                    <div className="chat-source-tools">
                      <button type="button" onClick={() => loadSources()} className="chat-message-action">
                        Refresh sources
                      </button>
                      <button type="button" onClick={selectAllSources} disabled={sources.length === 0} className="chat-message-action">
                        Select all
                      </button>
                      <button type="button" onClick={clearSources} className="chat-message-action">
                        Search all
                      </button>
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
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {messages.map((chatMessage) => (
            <div
              key={chatMessage.id}
              className={chatMessage.role === 'user' ? 'chat-turn chat-turn-user' : 'chat-turn chat-turn-assistant'}
            >
              {chatMessage.role === 'assistant' ? <div className="chat-avatar">S</div> : null}
              <div className={chatMessage.role === 'user' ? 'chat-turn-body' : 'chat-turn-content'}>
                {chatMessage.title ? (
                  <p className="mb-2 text-sm font-medium text-[#000000]">{chatMessage.title}</p>
                ) : null}
                <p>
                  {formatAssistantContent(chatMessage.content)}
                  {chatMessage.isStreaming ? <span className="chat-typing-cursor" aria-hidden="true" /> : null}
                </p>

                {chatMessage.retrieval ? (
                  <div className="mt-4 ai-terminal">
                    <div>retrieval: {chatMessage.retrieval.strategy}</div>
                    <div>chunks: {chatMessage.retrieval.count}</div>
                    <div>scope: {chatMessage.retrieval.scopedLectureCount ?? 0} sources</div>
                    {chatMessage.retrieval.generation ? (
                      <div>generation: {chatMessage.retrieval.generation.provider}</div>
                    ) : null}
                  </div>
                ) : null}

                {chatMessage.sourceRefs?.length ? (
                  <div className="chat-citation-row">
                    {chatMessage.sourceRefs.map((source) => (
                      <span key={`${source.lectureId}-${source.segmentId}`} className="status-pill status-muted">
                        {source.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {chatMessage.role === 'assistant' && chatMessage.sourceRefs?.length ? (
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
              </div>
            </div>
          ))}

          {sending ? (
            <div className="chat-turn chat-turn-assistant">
              <div className="chat-avatar">S</div>
              <div className="chat-turn-content">
                <span className="ai-pill">
                  <span className="flex gap-1">
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                  </span>
                  Retrieving source context
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <form className="chat-composer-dock" onSubmit={sendMessage}>
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

            <div className="chat-input-shell">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="chat-input"
                rows={1}
                placeholder={`Message StudyFlow · ${selectedMode.hint}`}
              />
              <div className="chat-composer-footer">
                <span>{selectedMode.label} · {sourceLabel}</span>
                <button type="submit" className="chat-send-button" disabled={!message.trim() || sending} aria-label="Send message">
                  ↑
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
