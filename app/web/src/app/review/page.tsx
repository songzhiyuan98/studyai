'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const [deleteQueue, setDeleteQueue] = useState<StudyArtifact[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

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

  const visibleArtifactIds = useMemo(
    () => visibleArtifacts.map((artifact) => artifact.id).filter((id): id is string => Boolean(id)),
    [visibleArtifacts],
  );
  const selectedVisibleCount = selectedArtifactIds.filter((id) => visibleArtifactIds.includes(id)).length;
  const allVisibleSelected = visibleArtifactIds.length > 0 && selectedVisibleCount === visibleArtifactIds.length;

  useEffect(() => {
    setSelectedArtifactIds((current) => current.filter((id) => artifacts.some((artifact) => artifact.id === id)));
  }, [artifacts]);

  const toggleArtifactSelection = (artifactId: string | undefined) => {
    if (!artifactId) return;

    setSelectedArtifactIds((current) => (
      current.includes(artifactId)
        ? current.filter((id) => id !== artifactId)
        : [...current, artifactId]
    ));
  };

  const toggleSelectAllVisible = () => {
    setSelectedArtifactIds((current) => {
      const selected = new Set(current);

      if (allVisibleSelected) {
        visibleArtifactIds.forEach((id) => selected.delete(id));
      } else {
        visibleArtifactIds.forEach((id) => selected.add(id));
      }

      return Array.from(selected);
    });
  };

  const openDeleteDialog = (items: StudyArtifact[]) => {
    setDeleteQueue(items.filter((artifact) => artifact.id));
    setActionMessage('');
  };

  const deleteSelectedArtifacts = async () => {
    const ids = deleteQueue.map((artifact) => artifact.id).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;

    setDeleting(true);
    setActionMessage('');

    try {
      const responses = await Promise.all(
        ids.map((artifactId) => fetch(`/api/study/actions/${artifactId}`, { method: 'DELETE' })),
      );
      const failedResponse = responses.find((response) => !response.ok);

      if (failedResponse) {
        const result = await failedResponse.json().catch(() => ({}));
        throw new Error(result.error || 'Some saved outputs could not be deleted.');
      }

      setArtifacts((current) => current.filter((artifact) => !artifact.id || !ids.includes(artifact.id)));
      setSelectedArtifactIds((current) => current.filter((id) => !ids.includes(id)));
      setDeleteQueue([]);
    } catch (deleteError) {
      setActionMessage(deleteError instanceof Error ? deleteError.message : 'Saved outputs could not be deleted.');
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="flex items-center gap-3">
            {selectedArtifactIds.length > 0 ? (
              <div className="bulk-action-bar">
                <span>{selectedArtifactIds.length} selected</span>
                <button
                  type="button"
                  onClick={() => openDeleteDialog(artifacts.filter((artifact) => artifact.id && selectedArtifactIds.includes(artifact.id)))}
                  className="text-link text-red-700"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setSelectedArtifactIds([])} className="text-link">
                  Clear
                </button>
              </div>
            ) : null}
            <span className="hidden text-sm text-[#737373] sm:block">{visibleArtifacts.length} shown</span>
          </div>
        </div>

        {actionMessage ? (
          <div className="mb-4 border-l-2 border-[#ff7759] bg-[#ffad9b]/20 px-4 py-3 text-sm text-[#000000]">
            {actionMessage}
          </div>
        ) : null}

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
              <label className="saved-select-all">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={visibleArtifactIds.length === 0}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible saved outputs"
                />
                <span>Select visible outputs</span>
              </label>
              {visibleArtifacts.map((artifact) => (
                <article key={artifact.id} className="artifact-row">
                  <label className="bulk-select-control saved-row-check">
                    <input
                      type="checkbox"
                      checked={Boolean(artifact.id && selectedArtifactIds.includes(artifact.id))}
                      onChange={() => toggleArtifactSelection(artifact.id)}
                      aria-label={`Select ${artifact.title}`}
                    />
                  </label>
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
                            <Link
                              key={`${artifact.id}-${ref.segmentId}`}
                              href={`/documents/${ref.lectureId}?segmentId=${encodeURIComponent(ref.segmentId)}`}
                              className="status-pill"
                            >
                              {ref.label}
                            </Link>
                          ))
                        )}
                      </div>
                      {artifact.relatedRefs?.length ? (
                        <div className="mt-3">
                          <p className="text-xs text-[#737373]">Related context</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {artifact.relatedRefs.map((ref) => (
                              <Link
                                key={`${artifact.id}-related-${ref.segmentId}`}
                                href={`/documents/${ref.lectureId}?segmentId=${encodeURIComponent(ref.segmentId)}`}
                                className="status-pill status-muted"
                              >
                                {ref.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="artifact-row-actions">
                    <button
                      type="button"
                      onClick={() => openDeleteDialog([artifact])}
                      disabled={!artifact.id}
                      className="text-link text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </section>

      {deleteQueue.length > 0 ? (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-lg">
            <p className="text-xs uppercase tracking-normal text-[#737373]">Delete saved outputs</p>
            <h2 className="mt-2 text-xl font-normal text-[#000000]">
              Delete {deleteQueue.length} saved {deleteQueue.length === 1 ? 'output' : 'outputs'}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#737373]">
              This removes the saved generated material from your archive. The original Library sources and parsed passages stay available for Chat.
            </p>
            <div className="mt-5 max-h-40 overflow-y-auto border-y border-[#e5e5e5]">
              {deleteQueue.map((artifact) => (
                <div key={artifact.id} className="py-3">
                  <div className="truncate text-sm font-medium text-[#000000]">{artifact.title}</div>
                  <div className="mt-1 text-xs text-[#737373]">{artifact.type.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteQueue([])}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSelectedArtifacts}
                disabled={deleting}
                className="btn-primary bg-red-700 hover:bg-red-800"
              >
                {deleting ? 'Deleting...' : 'Delete outputs'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
