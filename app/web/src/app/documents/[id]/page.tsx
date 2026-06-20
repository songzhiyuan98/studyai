'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const citedSegmentId = searchParams.get('segmentId');
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

        const citedSegment = citedSegmentId
          ? readerLecture.segments.find((segment) => segment.id === citedSegmentId)
          : null;

        setLecture(readerLecture);
        setSelectedSegments(citedSegment
          ? [citedSegment.id]
          : readerLecture.segments[0]
            ? [readerLecture.segments[0].id]
            : []);
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
  }, [citedSegmentId, params.id]);

  useEffect(() => {
    if (!lecture || !citedSegmentId) return;

    const target = document.querySelector(`[data-segment-id="${CSS.escape(citedSegmentId)}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [citedSegmentId, lecture]);

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
          <div className="h-5 w-40 rounded bg-[#fafafa]" />
          <div className="h-9 w-28 rounded-full bg-[#fafafa]" />
        </div>
        <div className="reader-grid">
          <div className="space-y-3 border-r border-[#e5e5e5] p-4">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 rounded bg-[#fafafa]" />)}
          </div>
          <div className="space-y-4 p-8">
            <div className="h-8 w-72 rounded bg-[#fafafa]" />
            <div className="h-32 rounded bg-[#fafafa]" />
          </div>
          <div className="border-l border-[#e5e5e5] p-4">
            <div className="h-56 rounded bg-[#fafafa]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="tool-shell">
        <div className="page-header">
          <p className="eyebrow">Source inspector</p>
          <h1 className="page-title">Lecture unavailable</h1>
          <p className="page-description">{error || 'This lecture does not exist or you do not have access to it.'}</p>
        </div>
        <div className="border-y border-[#e5e5e5] py-6">
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
          <div className="flex items-center gap-2 text-xs text-[#737373]">
            <Link href="/library" className="hover:text-[#000000]">Library</Link>
            <span>/</span>
            <span>Source diagnostics</span>
          </div>
          <h1 className="mt-2 truncate text-2xl font-normal text-[#000000]">{lecture.title}</h1>
          <p className="mt-1 truncate text-sm text-[#737373]">{lecture.metaLine.replace('segments', 'passages')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-pill">{selectedSegments.length} selected</span>
          <Link href="/chat" className="reader-primary-action">Open Chat</Link>
        </div>
      </header>

      <div className="reader-frame">
        <div className="reader-grid">
        <main className="reading-canvas">
          <div className="reader-section-header">
            <div className="min-w-0">
              <p className="text-xs text-[#737373]">Parsed source</p>
              <h2 className="mt-1 text-lg font-medium text-[#000000]">{lecture.segments.length} passages extracted</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#737373]">
                Inspect parsed text and source references before Chat uses this file for grounded answers.
              </p>
            </div>
            <div className="reader-action-bar">
              <span className="status-pill">{selectedSegments.length} selected</span>
              <button
                className="reader-primary-action"
                disabled={selectedSegments.length === 0 || submittingAction !== null}
                onClick={() => runStudyAction('explain')}
              >
                {submittingAction === 'explain' ? 'Working...' : 'Test explain'}
              </button>
              {studyActions.filter((action) => action.id !== 'explain').map((action) => (
                <button
                  key={action.id}
                  className="reader-secondary-action"
                  disabled={selectedSegments.length === 0 || submittingAction !== null}
                  onClick={() => runStudyAction(action.id)}
                >
                  {submittingAction === action.id ? 'Working...' : action.label}
                </button>
              ))}
            </div>
          </div>
          {actionError ? (
            <p className="mb-4 border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
          ) : null}

          {lecture.segments.length === 0 ? (
            <div className="empty-state border-y border-[#e5e5e5]">
              <h3>No readable passages yet</h3>
              <p>This source is still processing or did not produce readable passages.</p>
            </div>
          ) : (
            <div className="reader-document">
              {lecture.segments.map((segment) => {
                const selected = selectedSegments.includes(segment.id);

                return (
                  <button
                    key={segment.id}
                    type="button"
                    data-segment-id={segment.id}
                    onClick={() => toggleSegment(segment.id)}
                    className={`reader-paragraph ${selected ? 'reader-paragraph-selected' : ''}`}
                  >
                    <span className="reader-source-label">{segment.sourceRef}</span>
                    <span className="block text-left text-[15px] leading-7 text-[#000000]">{segment.text}</span>
                  </button>
                );
              })}
            </div>
          )}
          <section className="reader-inline-section">
            <p className="text-xs text-[#737373]">Selected passages</p>
            <div className="mt-3 space-y-3">
              {selectedText.length === 0 ? (
                <p className="text-sm leading-6 text-[#737373]">
                  Select one or more passages from the parsed source list.
                </p>
              ) : (
                selectedText.map((segment) => (
                  <div key={segment.id} className="context-snippet">
                    <div className="mb-1 text-xs text-[#737373]">{segment.sourceRef}</div>
                    <p className="line-clamp-4 text-sm leading-6 text-[#737373]">{segment.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="reader-inline-section">
            <p className="text-xs text-[#737373]">Generated diagnostics</p>
            {artifacts.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[#737373]">
                Test outputs from this source appear here with references. Main learning continues in Chat.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
                {artifacts.map((artifact) => (
                  <article key={artifact.id || `${artifact.type}-${artifact.title}`} className="py-4">
                    <div className="mb-2 text-sm font-medium text-[#000000]">{artifact.title}</div>
                    <p className="text-sm leading-6 text-[#737373]">{artifact.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {artifact.sourceRefs.map((ref) => (
                        <span key={`${artifact.id}-${ref.segmentId}`} className="status-pill">
                          {ref.label}
                        </span>
                      ))}
                    </div>
                    {artifact.relatedRefs?.length ? (
                      <div className="mt-3 border-t border-[#e5e5e5] pt-3">
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
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
        </div>
      </div>
    </div>
  );
}
