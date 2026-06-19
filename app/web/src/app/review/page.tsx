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
        || artifact.sourceRefs.some((ref) => ref.label.toLowerCase().includes(query))
        || artifact.relatedRefs?.some((ref) => ref.label.toLowerCase().includes(query));

      return filterMatch && queryMatch;
    });
  }, [activeFilter, artifacts, searchQuery]);

  return (
    <div className="tool-shell">
      <header className="tool-hero">
        <div className="min-w-0">
          <p className="eyebrow">Saved</p>
          <h1 className="kb-title">Saved outputs</h1>
          <p className="tool-subtitle">
            Revisit generated summaries, quizzes, translations, and cheat sheets with the source references that produced them.
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

      <section className="saved-console">
        <div className="saved-filter-bar">
          <nav className="saved-filter-scroll" aria-label="Saved output filters">
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
                  className={active ? 'saved-filter-pill saved-filter-pill-active' : 'saved-filter-pill'}
                >
                  <span>{filter.label}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </nav>
          <span className="hidden text-sm text-[#737373] sm:block">{visibleArtifacts.length} shown</span>
        </div>

        <main className="saved-board">
          {loading ? (
            <div className="space-y-3 border-t border-[#e5e5e5] py-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 rounded-md bg-[#fafafa]/60" />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state border-t border-[#e5e5e5]">
              <h3>Saved outputs unavailable</h3>
              <p>{error}</p>
            </div>
          ) : visibleArtifacts.length === 0 ? (
            <div className="empty-state border-t border-[#e5e5e5]">
              <h3>No saved outputs here</h3>
              <p>Use Chat or open a source reader to save source-backed material here.</p>
            </div>
          ) : (
            <div className="artifact-stream">
              {visibleArtifacts.map((artifact) => (
                <article key={artifact.id} className="artifact-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill status-ready">{artifact.type.replace('_', ' ')}</span>
                      <span className="text-xs text-[#737373]">{formatArtifactDate(artifact.createdAt)}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-normal text-[#000000]">{artifact.title}</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#737373]">{artifact.content}</p>
                    <div className="artifact-source-strip">
                      <p className="text-xs text-[#737373]">References</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {artifact.sourceRefs.length === 0 ? (
                          <span className="text-sm text-[#a3a3a3]">No source refs</span>
                        ) : (
                          artifact.sourceRefs.map((ref) => (
                            <span key={`${artifact.id}-${ref.segmentId}`} className="status-pill">
                              {ref.label}
                            </span>
                          ))
                        )}
                      </div>
                      {artifact.relatedRefs?.length ? (
                        <div className="mt-3">
                          <p className="text-xs text-[#737373]">Retrieved context</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {artifact.relatedRefs.map((ref) => (
                              <span key={`${artifact.id}-related-${ref.segmentId}`} className="status-pill status-muted">
                                {ref.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
