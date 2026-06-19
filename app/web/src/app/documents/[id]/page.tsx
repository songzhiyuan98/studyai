'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  LectureDetailApiRow,
  ReaderLecture,
  mapLectureDetailToReader,
} from '@/lib/reader-format';
import { StudyActionId, StudyArtifact, studyActions } from '@/lib/study-actions';

type LectureDetailResponse = {
  success: boolean;
  data?: {
    lecture: LectureDetailApiRow;
  };
  error?: string;
};

type StudyActionResponse = {
  success: boolean;
  data?: {
    artifact: StudyArtifact;
  };
  error?: string;
};

export default function DocumentReaderPage({ params }: { params: { id: string } }) {
  const [lecture, setLecture] = useState<ReaderLecture | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<StudyArtifact[]>([]);
  const [submittingAction, setSubmittingAction] = useState<StudyActionId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLecture() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/lectures/${params.id}`);
        const result = (await response.json()) as LectureDetailResponse;

        if (!response.ok || !result.success || !result.data?.lecture) {
          throw new Error(result.error || 'Lecture could not be loaded.');
        }

        const readerLecture = mapLectureDetailToReader(result.data.lecture);

        if (!active) return;

        setLecture(readerLecture);
        setSelectedSegments(readerLecture.segments[0] ? [readerLecture.segments[0].id] : []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Lecture could not be loaded.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLecture();

    return () => {
      active = false;
    };
  }, [params.id]);

  const selectedText = useMemo(
    () => lecture?.segments.filter((segment) => selectedSegments.includes(segment.id)) || [],
    [lecture, selectedSegments],
  );

  const toggleSegment = (segmentId: string) => {
    setSelectedSegments((current) =>
      current.includes(segmentId)
        ? current.filter((id) => id !== segmentId)
        : [...current, segmentId],
    );
  };

  const runStudyAction = async (action: StudyActionId) => {
    if (!lecture || selectedSegments.length === 0 || submittingAction) return;

    setSubmittingAction(action);
    setActionError(null);

    try {
      const response = await fetch('/api/study/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureId: lecture.id,
          segmentIds: selectedSegments,
          action,
        }),
      });
      const result = (await response.json()) as StudyActionResponse;

      if (!response.ok || !result.success || !result.data?.artifact) {
        throw new Error(result.error || 'Study action could not be created.');
      }

      setArtifacts((current) => [result.data!.artifact, ...current]);
    } catch (actionRequestError) {
      setActionError(
        actionRequestError instanceof Error
          ? actionRequestError.message
          : 'Study action could not be created.',
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="reader-shell">
        <div className="reader-topbar">
          <div className="h-5 w-40 rounded bg-[#eeece7]" />
          <div className="h-9 w-28 rounded-full bg-[#eeece7]" />
        </div>
        <div className="reader-grid">
          <div className="space-y-3 border-r border-[#d9d9dd] p-4">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 rounded bg-[#eeece7]" />)}
          </div>
          <div className="space-y-4 p-8">
            <div className="h-8 w-72 rounded bg-[#eeece7]" />
            <div className="h-32 rounded bg-[#eeece7]" />
          </div>
          <div className="border-l border-[#d9d9dd] p-4">
            <div className="h-56 rounded bg-[#eeece7]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="tool-shell">
        <div className="page-header">
          <p className="eyebrow">Source reader</p>
          <h1 className="page-title">Lecture unavailable</h1>
          <p className="page-description">{error || 'This lecture does not exist or you do not have access to it.'}</p>
        </div>
        <div className="border-y border-[#d9d9dd] py-6">
          <p className="text-sm leading-6 text-gray-600">
            Return to the library and open a lecture from your own workspace.
          </p>
          <Link href="/library" className="btn-primary mt-4 inline-flex">
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-shell">
      <header className="reader-topbar">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[#75758a]">
            <Link href="/library" className="hover:text-[#17171c]">Library</Link>
            <span>/</span>
            <span>Reader</span>
          </div>
          <h1 className="mt-2 truncate text-2xl font-normal text-[#17171c]">{lecture.title}</h1>
          <p className="mt-1 truncate text-sm text-[#75758a]">{lecture.metaLine}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="status-pill">{selectedSegments.length} selected</span>
          <button className="btn-primary">Save scope</button>
        </div>
      </header>

      <div className="reader-frame">
        <div className="reader-grid">
        <aside className="segment-rail">
          <div className="mb-4">
            <p className="text-xs text-[#75758a]">Source map</p>
            <p className="mt-1 text-sm font-medium text-[#17171c]">{lecture.segments.length} segments</p>
          </div>

          {lecture.segments.length === 0 ? (
            <p className="text-sm leading-6 text-[#616161]">No readable source segments yet.</p>
          ) : (
            <div className="space-y-1">
              {lecture.segments.map((segment, index) => {
                const selected = selectedSegments.includes(segment.id);

                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => toggleSegment(segment.id)}
                    className={`source-map-row ${selected ? 'source-map-row-active' : ''}`}
                  >
                    <span className="text-xs text-[#93939f]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate">{segment.sourceRef}</span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className="reading-canvas">
          <div className="mb-8 max-w-3xl border-b border-[#d9d9dd] pb-6">
            <p className="eyebrow">Active scope</p>
            <h2 className="mt-2 text-3xl font-normal leading-tight text-[#17171c] sm:text-4xl">
              Read, select, and generate from exact source fragments.
            </h2>
          </div>

          {lecture.segments.length === 0 ? (
            <div className="empty-state border-y border-[#d9d9dd]">
              <h3>No readable segments yet</h3>
              <p>This lecture is still processing or did not produce text segments.</p>
            </div>
          ) : (
            <div className="reader-document">
              {lecture.segments.map((segment) => {
                const selected = selectedSegments.includes(segment.id);

                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => toggleSegment(segment.id)}
                    className={`reader-paragraph ${selected ? 'reader-paragraph-selected' : ''}`}
                  >
                    <span className="reader-source-label">{segment.sourceRef}</span>
                    <span className="block text-left text-base leading-8 text-[#212121]">{segment.text}</span>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        <aside className="study-panel">
          <section className="study-panel-section">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#75758a]">Next action</p>
                <h2 className="mt-1 text-base font-medium text-[#17171c]">Ask from selection</h2>
              </div>
              <span className="status-pill">{selectedSegments.length} refs</span>
            </div>
            <button
              className="btn-primary mt-4 w-full"
              disabled={selectedSegments.length === 0 || submittingAction !== null}
              onClick={() => runStudyAction('explain')}
            >
              {submittingAction === 'explain' ? 'Working...' : 'Explain selected context'}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {studyActions.filter((action) => action.id !== 'explain').map((action) => (
                <button
                  key={action.id}
                  className="scope-preset"
                  disabled={selectedSegments.length === 0 || submittingAction !== null}
                  onClick={() => runStudyAction(action.id)}
                >
                  {submittingAction === action.id ? 'Working...' : action.label}
                </button>
              ))}
            </div>
            {actionError ? (
              <p className="mt-3 border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
            ) : null}
          </section>

          <section className="study-panel-section">
            <p className="text-xs text-[#75758a]">Selected context</p>
            <div className="mt-3 space-y-3">
              {selectedText.length === 0 ? (
                <p className="text-sm leading-6 text-[#616161]">
                  Select one or more segments from the source map or document canvas.
                </p>
              ) : (
                selectedText.map((segment) => (
                  <div key={segment.id} className="context-snippet">
                    <div className="mb-1 text-xs text-[#75758a]">{segment.sourceRef}</div>
                    <p className="line-clamp-4 text-sm leading-6 text-[#616161]">{segment.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="study-panel-section">
            <p className="text-xs text-[#75758a]">Output</p>
            {artifacts.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[#616161]">
                Generated explanations, summaries, quizzes, and cheat sheets appear here with source references.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#d9d9dd] border-y border-[#d9d9dd]">
                {artifacts.map((artifact) => (
                  <article key={artifact.id || `${artifact.type}-${artifact.title}`} className="py-4">
                    <div className="mb-2 text-sm font-medium text-[#17171c]">{artifact.title}</div>
                    <p className="text-sm leading-6 text-[#616161]">{artifact.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {artifact.sourceRefs.map((ref) => (
                        <span key={`${artifact.id}-${ref.segmentId}`} className="status-pill">
                          {ref.label}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
        </div>
      </div>
    </div>
  );
}
