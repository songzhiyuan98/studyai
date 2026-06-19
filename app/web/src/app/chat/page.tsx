'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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
  reason?: 'lexical' | 'nearby';
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  title?: string;
  content: string;
  sourceRefs?: SourceRef[];
  retrieval?: {
    strategy: string;
    count: number;
    scopedLectureCount?: number;
  };
  mode?: ActionMode;
  savedId?: string;
};

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

export default function ChatPage() {
  const [mode, setMode] = useState<ActionMode>('free');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [confirmedSources, setConfirmedSources] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedMode = useMemo(
    () => actionModes.find((action) => action.id === mode) || actionModes[0],
    [mode],
  );
  const sourceLabel = confirmedSources.length === 0
    ? 'All ready sources'
    : `${confirmedSources.length} ${confirmedSources.length === 1 ? 'source' : 'sources'}`;

  useEffect(() => {
    let mounted = true;

    const loadSources = async () => {
      setLoadingSources(true);
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

        if (!mounted) return;

        const loadedSources = payload.data.sources as ChatSource[];
        setSources(loadedSources);
        setConfirmedSources(loadedSources.slice(0, 3).map((source) => source.id));
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load chat sources.');
      } finally {
        if (mounted) {
          setLoadingSources(false);
        }
      }
    };

    loadSources();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleSource = (sourceId: string) => {
    setConfirmedSources((current) => (
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId]
    ));
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
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          mode,
          lectureIds: confirmedSources,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to generate a grounded response.');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          ...payload.data.message,
          mode,
        },
      ]);
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
        <section className="chat-scroll">
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
              <p>
                Choose a source scope before sending, or leave it empty and I will search all ready sources.
              </p>

              <div className="chat-source-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#000000]">Source scope</p>
                    <p className="mt-1 text-xs text-[#737373]">Ready Library files become searchable context for Chat.</p>
                  </div>
                  <span className="status-pill status-muted">
                    {loadingSources ? 'Loading' : sourceLabel}
                  </span>
                </div>
                <div className="mt-4 ai-terminal">
                  <div className="ai-terminal-lights">
                    <span className="bg-[#ff5f56]" />
                    <span className="bg-[#ffbd2e]" />
                    <span className="bg-[#27c93f]" />
                  </div>
                  <div>retrieval: lexical_page_aware_v0</div>
                  <div>mode: {selectedMode.label}</div>
                  <div>scope: {confirmedSources.length > 0 ? `${confirmedSources.length} selected` : 'all ready sources'}</div>
                </div>

                {error ? (
                  <div className="mt-4 border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-4 divide-y divide-[#e5e5e5]">
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
                <p>{formatAssistantContent(chatMessage.content)}</p>

                {chatMessage.retrieval ? (
                  <div className="mt-4 ai-terminal">
                    <div>retrieval: {chatMessage.retrieval.strategy}</div>
                    <div>chunks: {chatMessage.retrieval.count}</div>
                    <div>scope: {chatMessage.retrieval.scopedLectureCount ?? 0} sources</div>
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
                      disabled={Boolean(chatMessage.savedId) || savingMessageId === chatMessage.id}
                      className="chat-message-action"
                    >
                      {chatMessage.savedId
                        ? 'Saved'
                        : savingMessageId === chatMessage.id
                          ? 'Saving...'
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
