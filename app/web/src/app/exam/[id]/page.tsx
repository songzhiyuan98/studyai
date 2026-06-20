'use client';

import { useState } from 'react';

const questions = [
  {
    id: 'q1',
    question: 'What makes supervised learning different from unsupervised learning?',
    options: ['It uses labeled examples', 'It never uses training data', 'It only works on text', 'It removes all features'],
    source: 'Lecture 01 · page 1 · seg_2',
  },
  {
    id: 'q2',
    question: 'Which source should a generated answer cite when explaining clustering?',
    options: ['The retrieval segment about hidden structure', 'The login page', 'The upload API logs', 'A random web result'],
    source: 'Lecture 01 · page 2 · seg_3',
  },
];

export default function ExamPage({ params }: { params: { id: string } }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Assessment preview</p>
        <h1 className="page-title">Mini quiz from a study scope</h1>
        <p className="page-description">
          Exam workflows are intentionally downstream from reliable source parsing, context selection, and citation validation. This preview shows how each question should stay attached to evidence. Route id: {params.id}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="card">
              <div className="mb-4 flex items-center justify-between">
                <span className="chip">Question {index + 1}</span>
                <span className="chip-blue">{question.source}</span>
              </div>
              <h2 className="text-base font-medium text-gray-950">{question.question}</h2>
              <div className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selected ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <aside className="card h-fit">
          <h2 className="section-title">Why this comes later</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Full mock exams depend on trustworthy source passages, context selection, and citation validation. The MVP should first make small actions reliable.
          </p>
          <div className="mt-4 space-y-2">
            <span className="chip">source-backed questions</span>
            <span className="chip">scope-based generation</span>
            <span className="chip">grading planned later</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
