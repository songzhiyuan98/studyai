import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'StudyFlow workspace overview.',
};

const primaryActions = [
  {
    title: 'Chat',
    description: 'Start with a study goal and retrieve grounded library context.',
    href: '/chat',
  },
  {
    title: 'Library',
    description: 'Organize source files and open processed lectures.',
    href: '/library',
  },
];

const principles = [
  'Original lecture material stays the source of truth.',
  'Every generated artifact should keep source references visible.',
  'PDF parsing and RAG retrieval are the next ingestion milestone.',
];

export default function DashboardPage() {
  return (
    <div className="tool-shell">
      <section className="border-b border-[#e5e5e5] pb-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div className="min-w-0">
          <p className="eyebrow">Workspace</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-normal leading-[1.08] tracking-normal text-[#000000] sm:text-5xl">
              A source-grounded study desk for every lecture.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#737373]">
              StudyFlow keeps course files, selected context, generated study outputs, and source references in one calm workspace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/chat" className="btn-primary">
                Start chat
              </Link>
              <Link href="/library" className="btn-secondary">
                Open library
              </Link>
            </div>
          </div>

          <div className="border-y border-[#e5e5e5] py-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-normal text-[#737373]">Current build</p>
              <span className="status-pill">prototype</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#737373]">
              Upload, library management, source-backed placeholder actions, and saved outputs are live.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#e5e5e5] pt-4 text-sm">
              <div>
                <p className="text-2xl font-normal text-[#000000]">01</p>
                <p className="mt-1 text-xs text-[#737373]">ingest</p>
              </div>
              <div>
                <p className="text-2xl font-normal text-[#000000]">02</p>
                <p className="mt-1 text-xs text-[#737373]">select</p>
              </div>
              <div>
                <p className="text-2xl font-normal text-[#000000]">03</p>
                <p className="mt-1 text-xs text-[#737373]">saved</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="grid border-y border-[#e5e5e5] md:grid-cols-2">
          {primaryActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className={`group block px-1 py-7 transition-colors hover:bg-[#fafafa]/35 md:px-6 ${
                index > 0 ? 'border-t border-[#e5e5e5] md:border-l md:border-t-0' : ''
              }`}
            >
              <div className="text-xs uppercase tracking-normal text-[#737373]">Step {String(index + 1).padStart(2, '0')}</div>
              <h2 className="mt-4 text-2xl font-normal tracking-normal text-[#000000]">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#737373]">{action.description}</p>
              <span className="mt-6 inline-flex text-sm font-medium text-[#000000] underline decoration-[#000000]/25 underline-offset-4 group-hover:decoration-[#000000]">
                Open
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <h2 className="text-2xl font-normal text-[#000000]">Secondary surfaces</h2>
        <div className="divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
          <Link href="/saved" className="block py-4 text-sm leading-6 text-[#737373] transition-colors hover:text-[#000000]">
            Open saved AI outputs and citations
          </Link>
          <Link href="/chat" className="block py-4 text-sm leading-6 text-[#737373] transition-colors hover:text-[#000000]">
            Use Chat for free-form study, translation, quizzes, and summaries
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <h2 className="text-2xl font-normal text-[#000000]">Product principles</h2>
        <div className="divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
          {principles.map((principle) => (
            <div key={principle} className="py-4 text-sm leading-6 text-[#737373]">
              {principle}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
