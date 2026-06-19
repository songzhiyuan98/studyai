'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  type LectureApiRow,
  mapLectureToLibraryItem,
  visibleLibraryItems,
} from '@/lib/lecture-format';

type Folder = {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
};

type UploadProgress = {
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
};

const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function LibraryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lectures, setLectures] = useState<LectureApiRow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadLibrary = async () => {
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

      setFolders(foldersResult.data || []);
      setLectures(lecturesResult.data?.lectures || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
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

  const activeFolder = folderOptions.find((folder) => folder.id === selectedFolder) || folderOptions[0];
  const targetFolderId = selectedFolder === 'all' ? folders[0]?.id : selectedFolder;
  const processedCount = libraryItems.filter((item) => item.status === 'Processed').length;

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return 'Only PDF, PPTX, and TXT files are supported.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is larger than 100MB.';
    }
    if (!targetFolderId) {
      return 'Create or select a collection before uploading.';
    }
    return null;
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    setActionMessage('');
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setActionMessage(result.error || 'Collection could not be created.');
      return;
    }

    setNewFolderName('');
    setShowNewFolder(false);
    setSelectedFolder(result.data.id);
    await loadLibrary();
  };

  const renameFolder = async (folder: Folder) => {
    const name = window.prompt('Rename collection', folder.name)?.trim();
    if (!name || name === folder.name) return;

    const response = await fetch(`/api/folders/${folder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setActionMessage(result.error || 'Collection could not be renamed.');
      return;
    }

    await loadLibrary();
  };

  const deleteFolder = async (folder: Folder) => {
    if (!window.confirm(`Delete empty collection "${folder.name}"?`)) return;

    const response = await fetch(`/api/folders/${folder.id}`, {
      method: 'DELETE',
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setActionMessage(result.error || 'Collection could not be deleted.');
      return;
    }

    if (selectedFolder === folder.id) {
      setSelectedFolder('all');
    }
    await loadLibrary();
  };

  const renameLecture = async (lectureId: string, currentTitle: string) => {
    const title = window.prompt('Rename material', currentTitle)?.trim();
    if (!title || title === currentTitle) return;

    const response = await fetch(`/api/lectures/${lectureId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setActionMessage(result.error || 'Material could not be renamed.');
      return;
    }

    await loadLibrary();
  };

  const deleteLecture = async (lectureId: string, title: string) => {
    if (!window.confirm(`Delete "${title}" and its generated study data?`)) return;

    const response = await fetch(`/api/lectures/${lectureId}`, {
      method: 'DELETE',
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setActionMessage(result.error || 'Material could not be deleted.');
      return;
    }

    await loadLibrary();
  };

  const uploadFile = async (file: File) => {
    const validation = validateFile(file);
    if (validation) {
      setUploadProgress((current) => [...current, { fileName: file.name, status: 'error', error: validation }]);
      return;
    }

    setUploadProgress((current) => [...current, { fileName: file.name, status: 'uploading' }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', targetFolderId!);

      const response = await fetch('/api/lectures', {
        method: 'POST',
        body: formData,
      });
      const resultText = await response.text();
      const result = resultText ? JSON.parse(resultText) : {};

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed.');
      }

      setUploadProgress((current) =>
        current.map((item) =>
          item.fileName === file.name ? { ...item, status: 'success' } : item,
        ),
      );
      await loadLibrary();
    } catch (uploadError) {
      setUploadProgress((current) =>
        current.map((item) =>
          item.fileName === file.name
            ? {
                ...item,
                status: 'error',
                error: uploadError instanceof Error ? uploadError.message : 'Upload failed.',
              }
            : item,
        ),
      );
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(uploadFile);
  };

  return (
    <div className="tool-shell">
      <header className="tool-hero">
        <div className="min-w-0">
          <p className="eyebrow">Library</p>
          <h1 className="tool-title">Study sources</h1>
          <p className="tool-subtitle">
            Keep lecture files, notes, and generated context in one source-backed workspace.
          </p>
        </div>
        <div className="tool-actions">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input-field h-11 min-w-0 sm:w-80"
            placeholder="Search materials"
          />
          <button
            type="button"
            onClick={() => setShowUploadPanel((value) => !value)}
            className="btn-primary h-11 shrink-0"
          >
            {showUploadPanel ? 'Close upload' : 'Add material'}
          </button>
        </div>
      </header>

      <section className="library-console">
        <aside className="collection-rail">
          <div className="flex items-center justify-between border-b border-[#d9d9dd] pb-3">
            <div>
              <p className="rail-label">Collections</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewFolderName('');
                setShowNewFolder(true);
              }}
              className="rail-action-button"
            >
              New
            </button>
          </div>

          <nav className="mt-4 space-y-2">
            {folderOptions.map((folder) => {
              const active = selectedFolder === folder.id;
              const editable = folder.id !== 'all';

              return (
                <div key={folder.id} className={`collection-line ${active ? 'collection-line-active' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedFolder(folder.id)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {folder.name}
                  </button>
                  {active && editable ? (
                    <button type="button" onClick={() => setEditingFolder(folder)} className="collection-edit-button">
                      Edit
                    </button>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-[#d9d9dd] pt-5">
            <p className="text-xs text-[#75758a]">Ready sources</p>
            <p className="mt-2 text-3xl font-normal text-[#17171c]">{processedCount}</p>
            <p className="mt-3 text-xs leading-5 text-[#616161]">
              Processed files can be opened as study scopes. Segment extraction is still mocked in this build.
            </p>
          </div>
        </aside>

        <main className="source-board">
          <div className="board-toolbar">
            <div>
              <p className="text-xs text-[#75758a]">Current collection</p>
              <h2 className="mt-1 text-2xl font-normal text-[#17171c]">{activeFolder?.name || 'All materials'}</h2>
            </div>
            <div className="flex items-center gap-5 text-sm text-[#75758a]">
              <span>{visibleItems.length} shown</span>
              <span>{libraryItems.length} total</span>
            </div>
          </div>

          {actionMessage ? (
            <div className="mb-4 border-l-2 border-[#ff7759] bg-[#ffad9b]/20 px-4 py-3 text-sm text-[#212121]">
              {actionMessage}
            </div>
          ) : null}

          {showUploadPanel ? (
            <section className="upload-drawer">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  if (event.dataTransfer.files.length > 0) {
                    handleFiles(event.dataTransfer.files);
                  }
                }}
                className={`upload-dropzone ${isDragActive ? 'upload-dropzone-active' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-[#17171c]">
                    Upload to {selectedFolder === 'all' ? folders[0]?.name || 'a collection' : folders.find((folder) => folder.id === selectedFolder)?.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#616161]">
                    Drop PDF, PPTX, or TXT files here. The parser will create source segments for later RAG work.
                  </p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary shrink-0">
                  Choose files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.pptx,.txt"
                  className="hidden"
                  onChange={(event) => event.target.files && handleFiles(event.target.files)}
                />
              </div>

              {uploadProgress.length > 0 ? (
                <div className="mt-4 divide-y divide-[#d9d9dd] border-y border-[#d9d9dd]">
                  {uploadProgress.map((item) => (
                    <div key={item.fileName} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#17171c]">{item.fileName}</div>
                        {item.error ? <div className="mt-1 text-sm text-red-700">{item.error}</div> : null}
                      </div>
                      <span className={item.status === 'success' ? 'status-pill status-ready' : item.status === 'error' ? 'status-pill status-error' : 'status-pill'}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="source-list">
            <div className="source-list-head">
              <span>Material</span>
              <span>Status</span>
              <span>Scope</span>
              <span>Updated</span>
              <span className="text-right">Manage</span>
            </div>

            {loading && (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-md bg-[#eeece7]/60" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="empty-state">
                <h3>Could not load materials</h3>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && visibleItems.length === 0 && (
              <div className="empty-state">
                <h3>No materials in this view</h3>
                <p>Open the upload drawer and add a lecture file to start building a source library.</p>
                <button type="button" onClick={() => setShowUploadPanel(true)} className="btn-primary mt-5">
                  Add first material
                </button>
              </div>
            )}

            {!loading && !error && visibleItems.length > 0 && (
              <div className="divide-y divide-[#d9d9dd]">
                {visibleItems.map((document) => (
                  <article key={document.id} className="source-row">
                    <Link href={`/documents/${document.id}`} className="min-w-0">
                      <div className="truncate text-base font-medium text-[#17171c]">{document.title}</div>
                      <div className="mt-1 truncate text-sm text-[#75758a]">
                        {document.originalName} · {document.folderName} · {document.fileSize}
                      </div>
                    </Link>
                    <span className={document.status === 'Processed' ? 'status-pill status-ready' : 'status-pill'}>
                      {document.status}
                    </span>
                    <span className="text-sm text-[#616161]">
                      {document.type} · {document.segments} segments
                    </span>
                    <span className="text-sm text-[#75758a]">{document.uploadedAt}</span>
                    <span className="flex justify-end gap-3">
                      <button type="button" onClick={() => renameLecture(document.id, document.title)} className="text-link">
                        Rename
                      </button>
                      <button type="button" onClick={() => deleteLecture(document.id, document.title)} className="text-link text-red-700">
                        Delete
                      </button>
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </section>

      {showNewFolder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17171c]/25 px-4">
          <div className="w-full max-w-sm rounded-lg border border-[#d9d9dd] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-normal text-[#75758a]">New collection</p>
            <h2 className="mt-2 text-xl font-normal text-[#17171c]">Create a folder?</h2>
            <p className="mt-2 text-sm leading-6 text-[#616161]">
              This folder will appear in your library sidebar and can hold uploaded lecture materials.
            </p>
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && createFolder()}
              className="input-field mt-4"
              placeholder="Folder name"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="button" onClick={createFolder} className="btn-primary">
                Create folder
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingFolder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17171c]/25 px-4">
          <div className="w-full max-w-sm rounded-lg border border-[#d9d9dd] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-normal text-[#75758a]">Edit folder</p>
            <h2 className="mt-2 text-xl font-normal text-[#17171c]">{editingFolder.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[#616161]">
              Rename this folder or delete it if it is empty.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingFolder(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const folder = editingFolder;
                  setEditingFolder(null);
                  await renameFolder(folder);
                }}
                className="btn-secondary"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={async () => {
                  const folder = editingFolder;
                  setEditingFolder(null);
                  await deleteFolder(folder);
                }}
                className="btn-secondary text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
