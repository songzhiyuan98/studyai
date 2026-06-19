'use client';

import { useEffect, useMemo, useState } from 'react';
import { StudyArtifact } from '@/lib/study-actions';

type StudyArtifactsResponse = {
  success: boolean;
  data?: {
    artifacts: StudyArtifact[];
  };
  error?: string;
};

const artifactFilters = [
  { id: 'all', label: 'All outputs' },
  { id: 'summarize', label: 'Summaries' },
  { id: 'key_terms', label: 'Key terms' },
  { id: 'mini_quiz', label: 'Quizzes' },
  { id: 'cheat_sheet', label: 'Cheat sheets' },
  { id: 'translate', label: 'Translations' },
] as const;

function formatArtifactDate(value: string | Date | undefined): string {
  if (!value) {
    return 'Saved recently';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function ReviewPage() {
  const [artifacts, setArtifacts] = useState<StudyArtifact[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof artifactFilters)[number]['id']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadArtifacts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/study/actions?limit=50');
        const result = (await response.json()) as StudyArtifactsResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || 'Saved artifacts could not be loaded.');
        }

        if (active) {
          setArtifacts(result.data.artifacts);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Saved artifacts could not be loaded.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadArtifacts();

    return () => {
      active = false;
    };
  }, []);

  const visibleArtifacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return artifacts.filter((artifact) => {
      const filterMatch = activeFilter === 'all' || artifact.type === activeFilter;
      const queryMatch = !query
        || artifact.title.toLowerCase().includes(query)
        || artifact.content.toLowerCase().includes(query)
        || artifact.sourceRefs.some((ref) => ref.label.toLowerCase().includes(query));

      return filterMatch && queryMatch;
    });
  }, [activeFilter, artifacts, searchQuery]);

  const sourceCount = new Set(artifacts.flatMap((artifact) => artifact.sourceRefs.map((ref) => ref.lectureId))).size;

  return (
    <div className="tool-shell">
      <header className="tool-hero">
        <div className="min-w-0">
          <p className="eyebrow">Review</p>
          <h1 className="tool-title">Study outputs</h1>
          <p className="tool-subtitle">
            Revisit generated study material with the references that produced it.
          </p>
        </div>
        <div className="tool-actions">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input-field h-11 min-w-0 sm:w-80"
            placeholder="Search outputs or sources"
          />
        </div>
      </header>

      <section className="review-console">
        <aside className="review-rail">
          <div className="border-b border-[#d9d9dd] pb-5">
            <p className="text-xs text-[#75758a]">Saved context</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-3xl font-normal text-[#17171c]">{artifacts.length}</p>
                <p className="text-xs text-[#75758a]">outputs</p>
              </div>
              <div>
                <p className="text-3xl font-normal text-[#17171c]">{sourceCount}</p>
                <p className="text-xs text-[#75758a]">sources</p>
              </div>
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {artifactFilters.map((filter) => {
              const active = activeFilter === filter.id;
              const count = filter.id === 'all'
                ? artifacts.length
                : artifacts.filter((artifact) => artifact.type === filter.id).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`collection-item ${active ? 'collection-item-active' : ''}`}
                >
                  <span>{filter.label}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="review-board">
          <div className="board-toolbar">
            <div>
              <p className="text-xs text-[#75758a]">Current view</p>
              <h2 className="mt-1 text-2xl font-normal text-[#17171c]">
                {artifactFilters.find((filter) => filter.id === activeFilter)?.label}
              </h2>
            </div>
            <span className="text-sm text-[#75758a]">{visibleArtifacts.length} shown</span>
          </div>

          {loading ? (
            <div className="space-y-3 border-t border-[#d9d9dd] py-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 rounded-md bg-[#eeece7]/60" />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state border-t border-[#d9d9dd]">
              <h3>Review unavailable</h3>
              <p>{error}</p>
            </div>
          ) : visibleArtifacts.length === 0 ? (
            <div className="empty-state border-t border-[#d9d9dd]">
              <h3>No saved outputs here</h3>
              <p>Open a lecture, select a source segment, and run a micro action to save source-backed material.</p>
            </div>
          ) : (
            <div className="artifact-stream">
              {visibleArtifacts.map((artifact) => (
                <article key={artifact.id} className="artifact-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill status-ready">{artifact.type.replace('_', ' ')}</span>
                      <span className="text-xs text-[#75758a]">{formatArtifactDate(artifact.createdAt)}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-normal text-[#17171c]">{artifact.title}</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616161]">{artifact.content}</p>
                  </div>
                  <aside className="artifact-sources">
                    <p className="text-xs text-[#75758a]">References</p>
                    <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
                      {artifact.sourceRefs.length === 0 ? (
                        <span className="text-sm text-[#93939f]">No source refs</span>
                      ) : (
                        artifact.sourceRefs.map((ref) => (
                          <span key={`${artifact.id}-${ref.segmentId}`} className="status-pill">
                            {ref.label}
                          </span>
                        ))
                      )}
                    </div>
                  </aside>
                </article>
              ))}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
