import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'StudyFlow workspace overview.',
};

const stats = [
  { label: 'Lectures', value: '12' },
  { label: 'Source segments', value: '1,247' },
  { label: 'Saved artifacts', value: '89' },
  { label: 'Active scopes', value: '3' },
];

const actions = [
  {
    title: 'Upload course material',
    description: 'Add PDFs, slides, or notes to a course workspace.',
    href: '/upload',
  },
  {
    title: 'Open library',
    description: 'Browse lectures and source status by folder.',
    href: '/library',
  },
  {
    title: 'Build study scope',
    description: 'Select lectures for a chapter, quiz, or exam review.',
    href: '/study',
  },
  {
    title: 'Review artifacts',
    description: 'Return to generated explanations, terms, and quizzes.',
    href: '/review',
  },
];

export default function DashboardPage() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Workspace</p>
        <h1 className="page-title">Your course context</h1>
        <p className="page-description">
          Manage lecture sources, continue active study scopes, and keep generated material tied to citations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="text-2xl font-semibold text-gray-950">{stat.value}</div>
            <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="surface">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="section-title">Next actions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {actions.map((action) => (
              <Link key={action.title} href={action.href} className="block px-5 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-950">{action.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{action.description}</p>
                  </div>
                  <span className="text-sm text-gray-400">Open</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="card">
          <h2 className="section-title">Active study scope</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            CS229 Midterm Review includes Lecture 01, Lecture 02, and Lecture 03.
          </p>
          <div className="mt-4 space-y-2">
            <div className="chip">43 source segments</div>
            <div className="chip">summary and terms saved</div>
          </div>
          <Link href="/study" className="btn-secondary mt-5 w-full">
            Continue scope
          </Link>
        </aside>
      </div>
    </div>
  );
}
