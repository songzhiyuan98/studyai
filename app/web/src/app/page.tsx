import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StudyFlow',
  description: 'A citation-first study workspace for student-owned lecture materials.',
};

const workflow = [
  {
    title: 'Organize course material',
    description: 'Keep lectures, PDFs, slides, and notes in one durable workspace instead of scattered chat sessions.',
  },
  {
    title: 'Parse into source segments',
    description: 'Lecture text is split into source-aware chunks that preserve page, slide, and segment references.',
  },
  {
    title: 'Study in small actions',
    description: 'Explain, summarize, translate, extract terms, or create a mini quiz from the exact scope you are reading.',
  },
  {
    title: 'Keep citations attached',
    description: 'Generated study artifacts stay linked to the original segment so you can verify every important point.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-gray-50">
      <section className="page-shell">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="py-10">
            <p className="eyebrow mb-4">Student-owned course context</p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-normal text-gray-950 sm:text-5xl">
              StudyFlow keeps your lectures, AI help, and source citations in one place.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">
              Upload lecture files, browse parsed source segments, select a precise study scope,
              and ask for small grounded actions while you learn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Create workspace
              </Link>
              <Link href="/login" className="btn-secondary">
                Open existing workspace
              </Link>
            </div>
          </div>

          <div className="surface mt-4 overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Current study scope</span>
                <span className="chip-blue">CS229 · Week 1-3</span>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-md border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Lecture 02</span>
                  <span>page 12 · seg_24</span>
                </div>
                <p className="text-sm leading-6 text-gray-700">
                  Supervised learning estimates a mapping from inputs to outputs using labeled examples.
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Micro action
                </div>
                <p className="text-sm font-medium text-gray-950">Explain this concept in simple terms</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  The model learns from examples that already include correct answers, then applies that pattern to new cases.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="chip">source: L02 p12</span>
                  <span className="chip">scope: selected segment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="page-shell">
          <div className="mb-8">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="page-title">Built for continuous studying, not one-off generation</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item, index) => (
              <div key={item.title} className="card">
                <div className="mb-4 text-sm font-medium text-blue-600">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="section-title">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
