import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'StudyFlow workspace overview.',
};

const primaryActions = [
  {
    title: 'Library',
    description: 'Organize source files and open processed lectures.',
    href: '/library',
  },
  {
    title: 'Reader',
    description: 'Select exact segments and run small AI actions.',
    href: '/library',
  },
  {
    title: 'Review',
    description: 'Reuse saved outputs with source references visible.',
    href: '/review',
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
      <section className="border-b border-[#d9d9dd] pb-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div className="min-w-0">
          <p className="eyebrow">Workspace</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-normal leading-[1.08] tracking-normal text-[#17171c] sm:text-5xl">
              A source-grounded study desk for every lecture.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#616161]">
              StudyFlow keeps course files, selected context, generated study outputs, and source references in one calm workspace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/library" className="btn-primary">
                Open library
              </Link>
              <Link href="/review" className="btn-secondary">
                Review outputs
              </Link>
            </div>
          </div>

          <div className="border-y border-[#d9d9dd] py-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-normal text-[#75758a]">Current build</p>
              <span className="status-pill">prototype</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#616161]">
              Upload, library management, source-backed placeholder actions, and saved review outputs are live.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#d9d9dd] pt-4 text-sm">
              <div>
                <p className="text-2xl font-normal text-[#17171c]">01</p>
                <p className="mt-1 text-xs text-[#75758a]">ingest</p>
              </div>
              <div>
                <p className="text-2xl font-normal text-[#17171c]">02</p>
                <p className="mt-1 text-xs text-[#75758a]">select</p>
              </div>
              <div>
                <p className="text-2xl font-normal text-[#17171c]">03</p>
                <p className="mt-1 text-xs text-[#75758a]">review</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="grid border-y border-[#d9d9dd] md:grid-cols-3">
          {primaryActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className={`group block px-1 py-7 transition-colors hover:bg-[#eeece7]/35 md:px-6 ${
                index > 0 ? 'border-t border-[#d9d9dd] md:border-l md:border-t-0' : ''
              }`}
            >
              <div className="text-xs uppercase tracking-normal text-[#75758a]">Step {String(index + 1).padStart(2, '0')}</div>
              <h2 className="mt-4 text-2xl font-normal tracking-normal text-[#17171c]">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#616161]">{action.description}</p>
              <span className="mt-6 inline-flex text-sm font-medium text-[#17171c] underline decoration-[#17171c]/25 underline-offset-4 group-hover:decoration-[#17171c]">
                Open
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <h2 className="text-2xl font-normal text-[#17171c]">Product principles</h2>
        <div className="divide-y divide-[#d9d9dd] border-y border-[#d9d9dd]">
          {principles.map((principle) => (
            <div key={principle} className="py-4 text-sm leading-6 text-[#616161]">
              {principle}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
