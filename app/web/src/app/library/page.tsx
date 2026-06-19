'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  type LectureApiRow,
  mapLectureToLibraryItem,
  visibleLibraryItems,
} from '@/lib/lecture-format';

type Folder = {
  id: string;
  name: string;
  documentCount: number;
};

export default function LibraryPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lectures, setLectures] = useState<LectureApiRow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadLibrary() {
      setLoading(true);
      setError('');

      try {
        const [foldersResponse, lecturesResponse] = await Promise.all([
          fetch('/api/folders'),
          fetch('/api/lectures?limit=100'),
        ]);

        if (!foldersResponse.ok || !lecturesResponse.ok) {
          throw new Error('Failed to load library data.');
        }

        const foldersResult = await foldersResponse.json();
        const lecturesResult = await lecturesResponse.json();

        if (!mounted) return;

        setFolders(foldersResult.data || []);
        setLectures(lecturesResult.data?.lectures || []);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load library.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      mounted = false;
    };
  }, []);

  const libraryItems = useMemo(
    () => lectures.map(mapLectureToLibraryItem),
    [lectures],
  );

  const visibleItems = useMemo(
    () => visibleLibraryItems(libraryItems, selectedFolder, searchQuery),
    [libraryItems, selectedFolder, searchQuery],
  );

  const folderOptions = useMemo(() => [
    { id: 'all', name: 'All materials', documentCount: libraryItems.length },
    ...folders,
  ], [folders, libraryItems.length]);

  return (
    <div className="app-workspace">
      <aside className="workspace-sidebar">
        <div className="mb-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Library
          </div>
          <h1 className="text-lg font-semibold text-gray-950">Course materials</h1>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Folders</span>
          <Link href="/upload" className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
            Upload
          </Link>
        </div>

        <div className="space-y-1">
          {folderOptions.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedFolder(folder.id)}
              className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedFolder === folder.id
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
              }`}
            >
              <span className="truncate">{folder.name}</span>
              <span className={`ml-3 text-xs ${selectedFolder === folder.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {folder.documentCount || 0}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="workspace-main">
        <div className="workspace-toolbar">
          <div>
            <p className="eyebrow">Source library</p>
            <h2 className="page-title mt-1">Lectures ready for study scopes</h2>
          </div>
          <div className="flex min-w-0 flex-1 justify-end gap-2">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input-field max-w-sm"
              placeholder="Search title, file, or folder"
            />
            <Link href="/upload" className="btn-primary shrink-0">
              Add material
            </Link>
          </div>
        </div>

        <section className="desktop-panel overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[minmax(240px,1fr)_110px_120px_120px_120px] border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                <span>Material</span>
                <span>Type</span>
                <span>Status</span>
                <span>Segments</span>
                <span>Uploaded</span>
              </div>

              {loading && (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-14 rounded-md bg-gray-100" />
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="p-8 text-center">
                  <h3 className="text-sm font-medium text-gray-950">Could not load materials</h3>
                  <p className="mt-2 text-sm text-gray-500">{error}</p>
                </div>
              )}

              {!loading && !error && visibleItems.length === 0 && (
                <div className="p-10 text-center">
                  <h3 className="text-sm font-medium text-gray-950">No materials yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload a lecture file to start building source-backed study context.
                  </p>
                  <Link href="/upload" className="btn-secondary mt-5">
                    Upload first file
                  </Link>
                </div>
              )}

              {!loading && !error && visibleItems.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {visibleItems.map((document) => (
                    <Link
                      key={document.id}
                      href={`/documents/${document.id}`}
                      className="grid grid-cols-[minmax(240px,1fr)_110px_120px_120px_120px] items-center px-4 py-3 text-sm transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-950">{document.title}</div>
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          {document.originalName} · {document.folderName} · {document.fileSize}
                        </div>
                      </div>
                      <span className="chip w-fit">{document.type}</span>
                      <span className={document.status === 'Processed' ? 'chip-blue w-fit' : 'chip w-fit'}>
                        {document.status}
                      </span>
                      <span className="text-gray-600">{document.segments}</span>
                      <span className="text-gray-500">{document.uploadedAt}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
