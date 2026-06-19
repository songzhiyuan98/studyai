'use client';

import { useState } from 'react';

const lectures = [
  { id: 'lec_1', title: 'Lecture 01 · Foundations', segments: 45 },
  { id: 'lec_2', title: 'Lecture 02 · Linear Regression', segments: 61 },
  { id: 'lec_3', title: 'Lecture 03 · Classification', segments: 54 },
  { id: 'lec_4', title: 'Lecture 04 · Clustering', segments: 38 },
];

const actions = ['Explain hard parts', 'Summarize scope', 'Generate mini quiz'];

export default function StudyPage() {
  const [selected, setSelected] = useState(['lec_1', 'lec_2']);

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const selectedLectures = lectures.filter((lecture) => selected.includes(lecture.id));
  const segmentCount = selectedLectures.reduce((sum, lecture) => sum + lecture.segments, 0);

  return (
    <div className="tool-shell">
      <header className="tool-hero">
        <div className="min-w-0">
          <p className="eyebrow">Study scope</p>
          <h1 className="tool-title max-w-4xl">Choose context before asking AI.</h1>
          <p className="tool-subtitle">
            Retrieval and generation should stay inside the lectures you select, with source references preserved.
          </p>
        </div>
        <div className="rounded-lg bg-[#003c33] p-5 text-white lg:w-[320px]">
          <p className="text-xs text-white/65">Active scope</p>
          <p className="mt-2 text-3xl font-normal">{selected.length}</p>
          <p className="mt-2 text-sm leading-6 text-white/75">
            lectures selected, covering {segmentCount} source segments.
          </p>
        </div>
      </header>

      <section className="review-console">
        <aside className="review-rail">
          <p className="text-xs text-[#75758a]">Scope rules</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#616161]">
            <p>Use selected lectures as the retrieval boundary.</p>
            <p>Require citations on generated outputs.</p>
            <p>Keep actions small enough for quick iteration.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="status-pill status-ready">metadata RAG</span>
            <span className="status-pill">citation required</span>
          </div>
        </aside>

        <main className="review-board">
          <div className="board-toolbar">
            <div>
              <p className="text-xs text-[#75758a]">Source set</p>
              <h2 className="mt-1 text-2xl font-normal text-[#17171c]">Lectures in scope</h2>
            </div>
            <span className="text-sm text-[#75758a]">{segmentCount} segments</span>
          </div>

          <div className="artifact-stream">
            {lectures.map((lecture) => {
              const isSelected = selected.includes(lecture.id);

              return (
                <button
                  key={lecture.id}
                  type="button"
                  onClick={() => toggle(lecture.id)}
                  className="grid w-full gap-3 py-5 text-left transition-colors hover:bg-[#eeece7]/25 sm:grid-cols-[minmax(0,1fr)_120px_96px] sm:items-center"
                >
                  <span className="min-w-0 px-1">
                    <span className="block truncate text-base font-medium text-[#17171c]">{lecture.title}</span>
                    <span className="mt-1 block text-sm text-[#75758a]">{lecture.segments} source segments</span>
                  </span>
                  <span className="px-1 text-sm text-[#616161]">Lecture</span>
                  <span className={isSelected ? 'status-pill status-ready mx-1' : 'status-pill mx-1'}>
                    {isSelected ? 'In scope' : 'Add'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 border-t border-[#d9d9dd] pt-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
              <div>
                <p className="text-xs text-[#75758a]">Next study action</p>
                <h2 className="mt-1 text-2xl font-normal text-[#17171c]">Start from this scoped context.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#616161]">
                  These presets should become small, source-backed conversations rather than one-click content dumps.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button key={action} className="scope-preset">
                      {action}
                    </button>
                  ))}
                  <span className="scope-preset-muted">Cheat sheet later</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button className="btn-primary">Start scoped study</button>
                <button className="btn-secondary">Save scope</button>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}
