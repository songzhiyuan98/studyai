'use client';

import { useState } from 'react';
import Link from 'next/link';

const folders = [
  { id: 'all', name: 'All materials', count: 6 },
  { id: 'ml', name: 'Machine Learning', count: 3 },
  { id: 'ds', name: 'Data Structures', count: 1 },
  { id: 'algo', name: 'Algorithms', count: 2 },
];

const documents = [
  { id: 1, title: 'Machine Learning Foundations', type: 'PDF', status: 'Processed', segments: 45, folderId: 'ml', source: 'Lecture 01' },
  { id: 2, title: 'Linear Regression Slides', type: 'PPTX', status: 'Processing', segments: 0, folderId: 'ml', source: 'Lecture 02' },
  { id: 3, title: 'Graph Traversal Notes', type: 'TXT', status: 'Processed', segments: 18, folderId: 'algo', source: 'Week 04' },
  { id: 4, title: 'Dynamic Programming Review', type: 'PDF', status: 'Processed', segments: 42, folderId: 'algo', source: 'Week 06' },
];

export default function LibraryPage() {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const visibleDocuments = selectedFolder === 'all'
    ? documents
    : documents.filter((document) => document.folderId === selectedFolder);

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Library</p>
        <h1 className="page-title">Course materials</h1>
        <p className="page-description">
          Browse source files by course workspace and check whether they are ready for citation-backed study actions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card h-fit">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Folders</h2>
            <Link href="/upload" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Upload
            </Link>
          </div>
          <div className="space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolder(folder.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  selectedFolder === folder.id ? 'bg-gray-100 text-gray-950' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{folder.name}</span>
                <span className="text-xs text-gray-400">{folder.count}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="surface overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Lecture files</h2>
              <input className="input-field max-w-sm" placeholder="Search materials" />
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {visibleDocuments.map((document) => (
              <Link key={document.id} href={`/documents/${document.id}`} className="block px-5 py-4 hover:bg-gray-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-950">{document.title}</h3>
                      <span className="chip">{document.type}</span>
                      <span className={document.status === 'Processed' ? 'chip-blue' : 'chip'}>
                        {document.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {document.source} · {document.segments} source segments
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">Open reader</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
