'use client';

import { useMemo, useState } from 'react';

type ActionMode = 'free' | 'explain' | 'summarize' | 'key_terms' | 'mini_quiz' | 'cheat_sheet';

const actionModes: Array<{ id: ActionMode; label: string; hint: string }> = [
  { id: 'free', label: 'Ask freely', hint: 'Natural study chat' },
  { id: 'explain', label: 'Explain', hint: 'Clarify hard parts' },
  { id: 'summarize', label: 'Summarize', hint: 'Condense selected scope' },
  { id: 'key_terms', label: 'Key terms', hint: 'Extract vocabulary' },
  { id: 'mini_quiz', label: 'Mini quiz', hint: 'Practice questions' },
  { id: 'cheat_sheet', label: 'Cheat sheet', hint: 'Printable draft' },
];

const sourceCandidates = [
  {
    id: 'haskell',
    label: 'Haskell lecture',
    detail: 'pages 5-12 · functions and bindings',
    active: true,
  },
  {
    id: 'lambda',
    label: 'Lambda calculus notes',
    detail: 'segments 03-06 · function application',
    active: true,
  },
  {
    id: 'all-cse',
    label: 'All CSE materials',
    detail: 'broad fallback scope',
    active: false,
  },
];

const citedSources = [
  'Haskell lecture · page 5',
  'Haskell lecture · page 6',
  'Lambda calculus notes · segment 03',
];

export default function ChatPage() {
  const [mode, setMode] = useState<ActionMode>('free');
  const [message, setMessage] = useState('');
  const [confirmedSources, setConfirmedSources] = useState(
    sourceCandidates.filter((source) => source.active).map((source) => source.id),
  );

  const selectedMode = useMemo(
    () => actionModes.find((action) => action.id === mode) || actionModes[0],
    [mode],
  );
  const sourceLabel = confirmedSources.length === 0
    ? 'No source selected'
    : `${confirmedSources.length} sources`;

  const toggleSource = (sourceId: string) => {
    setConfirmedSources((current) => (
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId]
    ));
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
              Ask about your course material, or choose a quick action before sending. StudyFlow will keep answers grounded in your library.
            </p>
          </div>

          <div className="chat-turn chat-turn-user">
            <div className="chat-turn-body">
              Help me review Haskell functions for a quiz.
            </div>
          </div>

          <div className="chat-turn chat-turn-assistant">
            <div className="chat-avatar">S</div>
            <div className="chat-turn-content">
              <p>
                I found two likely sources. Before generating the answer, confirm whether I should use both of these or only the Haskell lecture.
              </p>

              <div className="chat-source-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#000000]">Retrieving source context</p>
                    <p className="mt-1 text-xs text-[#737373]">Confirm the material before I generate a grounded answer.</p>
                  </div>
                  <span className="status-pill status-muted">{sourceLabel}</span>
                </div>
                <div className="mt-4 ai-terminal">
                  <div className="ai-terminal-lights">
                    <span className="bg-[#ff5f56]" />
                    <span className="bg-[#ffbd2e]" />
                    <span className="bg-[#27c93f]" />
                  </div>
                  <div>query: haskell functions quiz review</div>
                  <div>scope: CSE library / recent uploads</div>
                  <div>mode: {selectedMode.label}</div>
                </div>
                <div className="mt-4 divide-y divide-[#e5e5e5]">
                  {sourceCandidates.map((source) => {
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
                  })}
                </div>
              </div>

              <div className="chat-citation-row">
                {citedSources.map((source) => (
                  <span key={source} className="status-pill status-muted">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <form className="chat-composer-dock" onSubmit={(event) => event.preventDefault()}>
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
                <button type="submit" className="chat-send-button" disabled={confirmedSources.length === 0} aria-label="Send message">
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
