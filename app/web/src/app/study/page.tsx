'use client';

import { useState } from 'react';

const lectures = [
  { id: 'lec_1', title: 'Lecture 01 · Foundations', segments: 45 },
  { id: 'lec_2', title: 'Lecture 02 · Linear Regression', segments: 61 },
  { id: 'lec_3', title: 'Lecture 03 · Classification', segments: 54 },
  { id: 'lec_4', title: 'Lecture 04 · Clustering', segments: 38 },
];

const actions = ['Explain hard parts', 'Summarize scope', 'Extract key terms', 'Generate mini quiz', 'Draft cheat sheet later'];

export default function StudyPage() {
  const [selected, setSelected] = useState(['lec_1', 'lec_2']);

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const segmentCount = lectures
    .filter((lecture) => selected.includes(lecture.id))
    .reduce((sum, lecture) => sum + lecture.segments, 0);

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Study scope</p>
        <h1 className="page-title">Choose the context before asking AI</h1>
        <p className="page-description">
          StudyFlow should retrieve and generate inside the material you select, not from an uncontrolled global context.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="section-title">Selected lectures</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {lectures.map((lecture) => {
              const isSelected = selected.includes(lecture.id);
              return (
                <button
                  key={lecture.id}
                  type="button"
                  onClick={() => toggle(lecture.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-950">{lecture.title}</div>
                    <div className="mt-1 text-sm text-gray-500">{lecture.segments} source segments</div>
                  </div>
                  <span className={isSelected ? 'chip-blue' : 'chip'}>
                    {isSelected ? 'In scope' : 'Add'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="section-title">Scope summary</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {selected.length} lectures selected, covering {segmentCount} source segments.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip-blue">metadata-filtered RAG</span>
              <span className="chip">citation required</span>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">Micro actions</h2>
            <div className="mt-3 space-y-2">
              {actions.map((action) => (
                <button key={action} className="btn-secondary w-full justify-start">
                  {action}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
