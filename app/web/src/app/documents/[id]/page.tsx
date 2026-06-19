'use client';

import { useMemo, useState } from 'react';

const documentData = {
  id: '1',
  title: 'Machine Learning Foundations',
  type: 'PDF',
  totalPages: 25,
  uploadedAt: '2026-06-19',
  segments: [
    {
      id: 'seg_1',
      page: 1,
      text: 'Machine learning is a branch of artificial intelligence focused on algorithms that learn patterns from data and make predictions without being explicitly programmed for every case.',
    },
    {
      id: 'seg_2',
      page: 1,
      text: 'Supervised learning trains models with labeled examples. Each example includes input features and a correct target output, allowing the model to learn an input-output mapping.',
    },
    {
      id: 'seg_3',
      page: 2,
      text: 'Unsupervised learning works without labels. It looks for hidden structure in data, such as clusters, lower-dimensional representations, or recurring patterns.',
    },
  ],
};

const microActions = ['Explain', 'Summarize', 'Translate', 'Key terms', 'Mini quiz'];

const generatedItems = [
  {
    id: 'item_1',
    type: 'Explain',
    content: 'Supervised learning means the model studies examples that already include correct answers, then uses that pattern on new examples.',
    sourceRefs: ['Lecture 01 · page 1 · seg_2'],
  },
  {
    id: 'item_2',
    type: 'Key terms',
    content: 'labeled examples, input features, target output, input-output mapping',
    sourceRefs: ['Lecture 01 · page 1 · seg_2'],
  },
];

export default function DocumentReaderPage({ params }: { params: { id: string } }) {
  const [selectedSegments, setSelectedSegments] = useState<string[]>(['seg_2']);

  const selectedCount = selectedSegments.length;
  const selectedText = useMemo(
    () => documentData.segments.filter((segment) => selectedSegments.includes(segment.id)),
    [selectedSegments],
  );

  const toggleSegment = (segmentId: string) => {
    setSelectedSegments((current) =>
      current.includes(segmentId)
        ? current.filter((id) => id !== segmentId)
        : [...current, segmentId],
    );
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Source reader</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title">{documentData.title}</h1>
            <p className="page-description">
              {documentData.type} · {documentData.totalPages} pages · uploaded {documentData.uploadedAt} · route id {params.id}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary">Download source</button>
            <button className="btn-primary">Save scope</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="surface px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-950">Current study scope</div>
                <div className="text-sm text-gray-500">{selectedCount} selected source segments</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {microActions.map((action) => (
                  <button key={action} className="btn-secondary px-3 py-1.5">
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {documentData.segments.map((segment) => {
              const selected = selectedSegments.includes(segment.id);
              return (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => toggleSegment(segment.id)}
                  className={`w-full rounded-lg border bg-white p-4 text-left transition-colors ${
                    selected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="chip">page {segment.page} · {segment.id}</span>
                    <span className={selected ? 'text-sm font-medium text-blue-700' : 'text-sm text-gray-400'}>
                      {selected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-gray-800">{segment.text}</p>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="section-title">Selected context</h2>
            <div className="mt-3 space-y-2">
              {selectedText.map((segment) => (
                <div key={segment.id} className="rounded-md bg-gray-50 p-3">
                  <div className="mb-1 text-xs text-gray-500">page {segment.page} · {segment.id}</div>
                  <p className="line-clamp-3 text-sm leading-6 text-gray-700">{segment.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">Saved artifacts</h2>
            <div className="mt-3 space-y-3">
              {generatedItems.map((item) => (
                <div key={item.id} className="rounded-md border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-950">{item.type}</span>
                    <span className="chip">source-backed</span>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">{item.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.sourceRefs.map((ref) => (
                      <span key={ref} className="chip">{ref}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
