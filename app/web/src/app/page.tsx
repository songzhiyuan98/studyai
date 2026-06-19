import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StudyFlow',
  description: 'A citation-first study workspace for student-owned lecture materials.',
};

const workflow = [
  ['01', 'Collect', 'Upload lectures, slides, notes, and PDFs into course folders.'],
  ['02', 'Select', 'Build a study scope from exact source segments.'],
  ['03', 'Generate', 'Ask for small explanations, summaries, quizzes, and terms.'],
  ['04', 'Review', 'Keep every output attached to source references.'],
];

const capabilities = [
  'Course file library',
  'Source segment reader',
  'Scope-based AI actions',
  'Saved study artifacts',
  'RAG-ready architecture',
  'Printable cheat sheet roadmap',
];

export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="marketing-shell">
        <div className="marketing-hero">
          <div className="min-w-0">
            <p className="eyebrow">Student-owned course context</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-normal leading-none tracking-normal text-[#17171c] sm:text-6xl lg:text-7xl">
              Study with AI that remembers your lecture sources.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#616161] sm:text-lg">
              StudyFlow gives students one place to manage course files, select precise context, and create grounded study outputs with citations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary h-11 px-6">
                Create workspace
              </Link>
              <Link href="/login" className="btn-secondary h-11 px-6">
                Sign in
              </Link>
            </div>
          </div>

          <div className="product-preview">
            <div className="flex items-center justify-between border-b border-[#d9d9dd] px-4 py-3">
              <span className="text-sm font-medium text-[#17171c]">Current study scope</span>
              <span className="status-pill">3 sources</span>
            </div>
            <div className="p-4">
              <div className="border-y border-[#d9d9dd]">
                {['Lecture 02 · page 12', 'Lecture 03 · slide 8', 'Review notes · section 4'].map((item) => (
                  <div key={item} className="flex items-center justify-between border-b border-[#d9d9dd] py-3 last:border-b-0">
                    <span className="text-sm text-[#616161]">{item}</span>
                    <span className="text-xs text-[#93939f]">selected</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg bg-[#eeece7]/55 p-4">
                <p className="text-xs uppercase tracking-normal text-[#75758a]">Grounded output</p>
                <p className="mt-3 text-sm leading-6 text-[#212121]">
                  A concise explanation generated from selected segments, with citations preserved for verification.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="status-pill">L02 p12</span>
                  <span className="status-pill">L03 s8</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9d9dd]">
        <div className="marketing-shell py-0">
          <div className="grid md:grid-cols-4">
            {workflow.map(([step, title, description], index) => (
              <div
                key={title}
                className={`py-6 md:px-5 ${index > 0 ? 'border-t border-[#d9d9dd] md:border-l md:border-t-0' : ''}`}
              >
                <p className="text-xs text-[#75758a]">{step}</p>
                <h2 className="mt-3 text-2xl font-normal text-[#17171c]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#616161]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-shell">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">Product surface</p>
            <h2 className="mt-3 text-3xl font-normal leading-tight text-[#17171c]">Built like a study tool, not a content generator.</h2>
          </div>
          <div className="grid gap-0 border-y border-[#d9d9dd] sm:grid-cols-2">
            {capabilities.map((item, index) => (
              <div
                key={item}
                className={`py-4 text-sm text-[#616161] sm:px-4 ${
                  index > 0 ? 'border-t border-[#d9d9dd]' : ''
                } ${index % 2 === 1 ? 'sm:border-l' : ''} ${index === 1 ? 'sm:border-t-0' : ''}`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
