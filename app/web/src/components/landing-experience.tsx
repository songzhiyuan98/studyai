'use client';

import { useEffect, useMemo, useState } from 'react';

const modes = [
  {
    id: 'plan',
    label: 'Study plan',
    prompt: 'What should I study for quiz 2?',
    answer: 'Start with lambda terms, then review Haskell function values and top-level bindings. I would spend 20 minutes on lecture examples, then test pattern matching with a short quiz.',
  },
  {
    id: 'explain',
    label: 'Explain',
    prompt: 'Explain top-level bindings like I am reviewing before class.',
    answer: 'A top-level binding gives a reusable name to a value or function. In the selected notes, Haskell uses equations such as pair x y b = ... so the name can be called later.',
  },
  {
    id: 'quiz',
    label: 'Mini quiz',
    prompt: 'Make a mini quiz from the selected lecture chunks.',
    answer: '1. Why are functions first-class values? 2. What does pattern matching choose first? 3. Write a binding for a function that swaps two arguments.',
  },
  {
    id: 'sheet',
    label: 'Cheat sheet',
    prompt: 'Draft a printable cheat sheet outline.',
    answer: 'Key terms: lambda term, binding, pattern, first-class function. Must-know examples: pair, fst, snd. Common mistake: treating equation order as irrelevant.',
  },
];

const sources = [
  { id: 'lambda', title: 'Week 2 / lambda.pdf', meta: 'CSE 114A · 16 chunks', ref: 'p7' },
  { id: 'haskell', title: 'Week 3 / haskell.pdf', meta: 'CSE 114A · 20 chunks', ref: 'p3' },
  { id: 'review', title: 'midterm-outline.md', meta: 'Review notes · 8 chunks', ref: 'note 4' },
];

const timeline = ['Read sources', 'Retrieve chunks', 'Draft answer', 'Attach citations'];

export function LandingExperience() {
  const [mode, setMode] = useState(modes[0].id);
  const [selectedSources, setSelectedSources] = useState(() => new Set(['lambda', 'haskell']));
  const [progress, setProgress] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);

  const activeMode = useMemo(() => modes.find((item) => item.id === mode) ?? modes[0], [mode]);
  const selectedSourceRows = sources.filter((source) => selectedSources.has(source.id));
  const selectedCount = selectedSourceRows.length;

  useEffect(() => {
    setProgress(0);
    setVisibleChars(0);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => (current >= timeline.length - 1 ? 0 : current + 1));
    }, 1100);

    return () => window.clearInterval(progressTimer);
  }, [mode, selectedCount]);

  useEffect(() => {
    setVisibleChars(0);
    const typingTimer = window.setInterval(() => {
      setVisibleChars((current) => Math.min(activeMode.answer.length, current + 3));
    }, 24);

    return () => window.clearInterval(typingTimer);
  }, [activeMode.answer, selectedCount]);

  const toggleSource = (id: string) => {
    setSelectedSources((current) => {
      const next = new Set(current);
      if (next.has(id) && next.size > 1) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section className="landing-demo-section" aria-label="Interactive product preview">
      <div className="landing-demo-heading">
        <p className="eyebrow">Interactive preview</p>
        <h2>Try the core loop: choose sources, ask, verify, save.</h2>
      </div>

      <div className="landing-demo">
        <div className="landing-demo-chat">
          <div className="landing-window-bar">
            <span>Study chat</span>
            <span className="status-pill">{selectedCount} sources selected</span>
          </div>

          <div className="landing-mode-strip" role="tablist" aria-label="Study actions">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={item.id === mode ? 'landing-mode-pill landing-mode-pill-active' : 'landing-mode-pill'}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="landing-chat-stream">
            <div className="landing-message landing-message-user">
              <p className="text-xs text-[#737373]">You</p>
              <p className="mt-2 text-sm leading-6 text-[#000000]">{activeMode.prompt}</p>
            </div>

            <div className="landing-thinking">
              {timeline.map((item, index) => (
                <span key={item} className={index <= progress ? 'landing-thinking-step landing-thinking-step-active' : 'landing-thinking-step'}>
                  {item}
                </span>
              ))}
            </div>

            <div className="landing-message">
              <p className="text-xs text-[#737373]">StudyFlow</p>
              <p className="mt-2 min-h-24 text-sm leading-6 text-[#000000]">
                {activeMode.answer.slice(0, visibleChars)}
                <span className="landing-cursor" aria-hidden="true" />
              </p>
              <div className="landing-citation-row">
                {selectedSourceRows.map((source) => (
                  <span key={source.id} className="status-pill">
                    {source.title.split('/').pop()?.trim()} {source.ref}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-prompt">
            <span>{activeMode.prompt}</span>
            <span className="landing-send">Ask</span>
          </div>
        </div>

        <div className="landing-demo-library">
          <div className="landing-window-bar">
            <span>Source scope</span>
            <span className="text-xs text-[#737373]">Click to include</span>
          </div>

          <div className="landing-source-list">
            {sources.map((source) => {
              const selected = selectedSources.has(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  className={selected ? 'landing-source-row landing-source-row-active' : 'landing-source-row'}
                >
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-sm font-medium text-[#000000]">{source.title}</span>
                    <span className="mt-1 block text-xs text-[#737373]">{source.meta}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[#737373]">{selected ? 'Selected' : 'Add'}</span>
                </button>
              );
            })}
          </div>

          <div className="landing-mini-output">
            <p className="text-xs text-[#737373]">What gets saved</p>
            <p className="mt-2 text-sm leading-6 text-[#000000]">
              The answer can be saved with its source scope, prompt, citations, and generated study artifact.
            </p>
          </div>

          <div className="landing-import-strip">
            <span className="landing-import-dot" />
            <span className="min-w-0 flex-1 truncate">Future flow: upload inside Chat, then confirm folder placement.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
