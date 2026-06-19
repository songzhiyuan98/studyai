import Link from 'next/link';
import type { Metadata } from 'next';
import { LandingExperience } from '@/components/landing-experience';

export const metadata: Metadata = {
  title: 'StudyFlow',
  description: 'A citation-first AI study workspace for student-owned lecture materials.',
};

const workflow = [
  ['01', 'Build your library', 'Create course folders, upload lecture PDFs, and keep every source in one searchable place.'],
  ['02', 'Chat with context', 'Ask what to review, request explanations, translate difficult passages, or generate practice questions.'],
  ['03', 'Check the evidence', 'Every useful answer can carry source references, pages, and selected chunks for fast verification.'],
  ['04', 'Save study assets', 'Keep strong answers, quiz drafts, cheat sheets, and review plans for later sessions.'],
];

const productMoments = [
  ['Source-grounded chat', 'A ChatGPT-like study surface that retrieves from your own lecture files before answering.'],
  ['Knowledge-base library', 'A Drive-style file manager for courses, folders, PDFs, notes, and future AI-assisted uploads.'],
  ['Micro-actions in chat', 'Quick pills for explain, summarize, translate, quiz, and cheat sheet generation without leaving the flow.'],
  ['Reader diagnostics', 'A developer-facing source map to inspect chunks, citations, and retrieval behavior while building RAG.'],
];

const comparison = [
  ['Generic chat', 'You paste files again, lose context, and manually remember which lecture matters.'],
  ['StudyFlow', 'Your library stays organized, retrieval is scoped, and the chat can cite the exact study material.'],
];

export default function HomePage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <Link href="/" className="landing-brand" aria-label="StudyFlow home">
            <span className="landing-brand-mark">
              <span />
            </span>
            <span>StudyFlow</span>
          </Link>

          <p className="eyebrow mt-10">AI study workspace for real course materials</p>
          <h1 className="landing-title">
            Turn lecture files into a study chat that remembers.
          </h1>
          <p className="landing-copy">
            StudyFlow gives students one place to manage PDFs, notes, source context, AI chat, saved outputs, and future cheat-sheet workflows.
          </p>

          <div className="landing-cta-row">
            <Link href="/register" className="btn-primary h-11 px-6">
              Create workspace
            </Link>
            <Link href="/login" className="btn-secondary h-11 px-6">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <LandingExperience />

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">Why it exists</p>
          <h2>Students do not just need another note app.</h2>
          <p>
            They need a place where study materials, source context, and AI interaction live together instead of being pasted into a new chat every time.
          </p>
        </div>

        <div className="landing-comparison">
          {comparison.map(([title, body]) => (
            <div key={title} className="landing-comparison-item">
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-band">
        <div className="landing-band-inner">
          <div>
            <p className="eyebrow">Product flow</p>
            <h2>Library organizes the sources. Chat becomes the learning surface.</h2>
          </div>
          <div className="landing-flow-grid">
            {workflow.map(([step, title, description]) => (
              <article key={title} className="landing-flow-item">
                <p>{step}</p>
                <h3>{title}</h3>
                <span>{description}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">What the product will support</p>
          <h2>Designed around small, continuous study interactions.</h2>
          <p>
            The goal is not one giant generated document. The product should keep students in a tight loop of asking, checking, saving, and refining.
          </p>
        </div>

        <div className="landing-moment-list">
          {productMoments.map(([title, description]) => (
            <div key={title} className="landing-moment-row">
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <p className="eyebrow">Start with your first course folder</p>
        <h2>Make your lecture files useful before the next quiz.</h2>
        <p>
          Create a workspace, add a few files, then let Chat help you decide what to study next.
        </p>
        <div className="landing-cta-row">
          <Link href="/register" className="btn-primary h-11 px-6">
            Create workspace
          </Link>
          <Link href="/login" className="btn-secondary h-11 px-6">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
