import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'StudyFlow workspace overview.',
};

const stats = [
  { label: 'Lectures', value: '12', hint: '4 processed this week' },
  { label: 'Source segments', value: '1,247', hint: 'citation-ready chunks' },
  { label: 'Saved artifacts', value: '89', hint: 'explanations and quizzes' },
  { label: 'Active scopes', value: '3', hint: 'midterm, weekly, custom' },
];

const actions = [
  {
    title: 'Add new course material',
    description: 'Upload a lecture PDF, slide deck, or note file and attach it to a folder.',
    href: '/upload',
    meta: '2 min',
  },
  {
    title: 'Review uploaded sources',
    description: 'Check processing status and open source-backed lecture readers.',
    href: '/library',
    meta: 'Library',
  },
  {
    title: 'Build a study scope',
    description: 'Select the exact lectures that should be available to RAG actions.',
    href: '/study',
    meta: 'Scope',
  },
];

const scopes = [
  { name: 'CS229 Midterm', coverage: 'Lecture 01-03', segments: 160 },
  { name: 'Algorithms weekly quiz', coverage: 'Week 04 notes', segments: 38 },
  { name: 'Custom review', coverage: 'Selected segments', segments: 12 },
];

export default function DashboardPage() {
  return (
    <div className="page-shell">
      <div className="workspace-toolbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="page-title mt-1">Your course context</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/library" className="btn-secondary">Open library</Link>
          <Link href="/upload" className="btn-primary">Add material</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="text-2xl font-semibold text-gray-950">{stat.value}</div>
            <div className="mt-1 text-sm font-medium text-gray-700">{stat.label}</div>
            <div className="mt-1 text-xs text-gray-500">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="desktop-panel overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h2 className="section-title">Recommended next steps</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {actions.map((action) => (
              <Link key={action.title} href={action.href} className="block px-5 py-4 transition-colors hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-950">{action.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">{action.description}</p>
                  </div>
                  <span className="chip shrink-0">{action.meta}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="desktop-panel overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
              <h2 className="section-title">Active study scopes</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {scopes.map((scope) => (
                <div key={scope.name} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate text-sm font-medium text-gray-950">{scope.name}</h3>
                    <span className="text-xs text-gray-400">{scope.segments} seg</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{scope.coverage}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">RAG readiness</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              The product should first make source parsing, scope selection, and citation-backed outputs feel dependable.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip-blue">source refs</span>
              <span className="chip">scope filters</span>
              <span className="chip">micro actions</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
