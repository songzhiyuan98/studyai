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
      <div className="page-shell">
        <div className="page-header">
          <p className="eyebrow">Source reader</p>
          <div className="mt-4 h-10 w-80 max-w-full rounded-md bg-gray-100" />
          <div className="mt-3 h-5 w-96 max-w-full rounded-md bg-gray-100" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="h-5 w-32 rounded bg-gray-100" />
                <div className="mt-4 h-4 w-full rounded bg-gray-100" />
                <div className="mt-2 h-4 w-4/5 rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="card h-64" />
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <p className="eyebrow">Source reader</p>
          <h1 className="page-title">Lecture unavailable</h1>
          <p className="page-description">{error || 'This lecture does not exist or you do not have access to it.'}</p>
        </div>
        <div className="desktop-panel p-5">
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
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Source reader</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title">{lecture.title}</h1>
            <p className="page-description">{lecture.metaLine}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/library" className="btn-secondary">
              Library
            </Link>
            <button className="btn-primary">Save scope</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="desktop-panel px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-950">Current study scope</div>
                <div className="text-sm text-gray-500">
                  {selectedSegments.length} selected source segments
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {studyActions.map((action) => (
                  <button
                    key={action.id}
                    className="btn-secondary px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={selectedSegments.length === 0 || submittingAction !== null}
                    onClick={() => runStudyAction(action.id)}
                  >
                    {submittingAction === action.id ? 'Working...' : action.label}
                  </button>
                ))}
              </div>
            </div>
            {actionError ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
            ) : null}
          </div>

          {lecture.segments.length === 0 ? (
            <div className="desktop-panel p-6">
              <h2 className="section-title">No readable segments yet</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                This lecture is still processing or did not produce text segments. Once source segments are available,
                this page becomes the workspace for small, source-backed study actions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lecture.segments.map((segment) => {
                const selected = selectedSegments.includes(segment.id);

                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => toggleSegment(segment.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selected
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="chip">{segment.sourceRef}</span>
                      <span className={selected ? 'text-sm font-medium text-blue-700' : 'text-sm text-gray-400'}>
                        {selected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-gray-800">{segment.text}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="section-title">Selected context</h2>
            <div className="mt-3 space-y-2">
              {selectedText.length === 0 ? (
                <p className="rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-500">
                  Select one or more source segments to build a study scope.
                </p>
              ) : (
                selectedText.map((segment) => (
                  <div key={segment.id} className="rounded-md bg-gray-50 p-3">
                    <div className="mb-1 text-xs text-gray-500">{segment.sourceRef}</div>
                    <p className="line-clamp-3 text-sm leading-6 text-gray-700">{segment.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">Study output</h2>
            {artifacts.length === 0 ? (
              <div className="mt-3 rounded-md border border-dashed border-gray-200 p-4">
                <p className="text-sm leading-6 text-gray-600">
                  Generated explanations, summaries, quizzes, and cheat sheets will appear here with source references.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {artifacts.map((artifact) => (
                  <article key={artifact.id || `${artifact.type}-${artifact.title}`} className="rounded-md border border-gray-200 p-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="chip-blue">{artifact.title}</span>
                    </div>
                    <p className="text-sm leading-6 text-gray-700">{artifact.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {artifact.sourceRefs.map((ref) => (
                        <span key={`${artifact.id}-${ref.segmentId}`} className="chip">
                          {ref.label}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
