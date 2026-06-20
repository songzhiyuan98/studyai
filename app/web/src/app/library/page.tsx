'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  type LectureApiRow,
  hasIndexingLectures,
  mapLectureToLibraryItem,
  visibleLibraryItems,
} from '@/lib/lecture-format';

type Folder = {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  documentCount: number;
  folderCount?: number;
};

type UploadProgress = {
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
};

const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatSourceStatus(status: string) {
  if (status === 'Processed') return 'Ready';
  if (status === 'Processing') return 'Indexing';
  if (status === 'Pending') return 'Queued';
  return status;
}

export default function LibraryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lectures, setLectures] = useState<LectureApiRow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newItemMode, setNewItemMode] = useState<'folder' | 'file'>('folder');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [selectedLectureIds, setSelectedLectureIds] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [reindexingVectors, setReindexingVectors] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadLibrary = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }
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
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const libraryItems = useMemo(
    () => lectures.map(mapLectureToLibraryItem),
    [lectures],
  );
  const hasIndexingSources = hasIndexingLectures(lectures);
  const hasVectorReindexSources = libraryItems.some((item) => item.needsVectorReindex);

  const activeFolder = selectedFolder === 'root' ? null : folders.find((folder) => folder.id === selectedFolder) || null;
  const currentFolders = useMemo(
    () => folders.filter((folder) => {
      const parentMatches = activeFolder ? folder.parentId === activeFolder.id : !folder.parentId;
      const queryMatches = folder.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return parentMatches && queryMatches;
    }),
    [activeFolder, folders, searchQuery],
  );
  const breadcrumbFolders = useMemo(() => {
    if (!activeFolder) return [];

    const chain: Folder[] = [];
    const visited = new Set<string>();
    let current: Folder | null = activeFolder;

    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current = current.parentId ? folders.find((folder) => folder.id === current?.parentId) || null : null;
    }

    return chain;
  }, [activeFolder, folders]);
  const visibleItems = useMemo(
    () => activeFolder ? visibleLibraryItems(libraryItems, activeFolder.id, searchQuery) : [],
    [activeFolder, libraryItems, searchQuery],
  );
  const targetFolderId = activeFolder?.id;
  const visibleLectureIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const selectedVisibleCount = selectedLectureIds.filter((id) => visibleLectureIds.includes(id)).length;
  const allVisibleSelected = visibleLectureIds.length > 0 && selectedVisibleCount === visibleLectureIds.length;

  useEffect(() => {
    setSelectedLectureIds((current) => current.filter((id) => visibleLectureIds.includes(id)));
  }, [visibleLectureIds]);

  useEffect(() => {
    if (!hasIndexingSources) return;

    const timer = window.setInterval(() => {
      loadLibrary({ silent: true });
    }, 2500);

    return () => window.clearInterval(timer);
  }, [hasIndexingSources, loadLibrary]);

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return 'Only PDF and TXT files are supported in the current parser.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is larger than 100MB.';
    }
    if (!targetFolderId) {
      return 'Open a folder before uploading source files.';
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
      body: JSON.stringify({ name, parentId: activeFolder?.id || null }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setActionMessage(result.error || 'Collection could not be created.');
      return;
    }

    setNewFolderName('');
    setShowNewFolder(false);
    setNewItemMode('folder');
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
      setSelectedFolder('root');
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

  const toggleLectureSelection = (lectureId: string) => {
    setSelectedLectureIds((current) => (
      current.includes(lectureId)
        ? current.filter((id) => id !== lectureId)
        : [...current, lectureId]
    ));
  };

  const toggleSelectAllVisible = () => {
    setSelectedLectureIds((current) => {
      const currentSet = new Set(current);

      if (allVisibleSelected) {
        visibleLectureIds.forEach((id) => currentSet.delete(id));
      } else {
        visibleLectureIds.forEach((id) => currentSet.add(id));
      }

      return Array.from(currentSet);
    });
  };

  const bulkDeleteLectures = async () => {
    if (selectedLectureIds.length === 0) return;

    setBulkDeleting(true);
    setActionMessage('');

    try {
      const responses = await Promise.all(
        selectedLectureIds.map((lectureId) => fetch(`/api/lectures/${lectureId}`, { method: 'DELETE' })),
      );

      const failedResponse = responses.find((response) => !response.ok);

      if (failedResponse) {
        const result = await failedResponse.json().catch(() => ({}));
        throw new Error(result.error || 'Some selected materials could not be deleted.');
      }

      setSelectedLectureIds([]);
      setShowBulkDelete(false);
      await loadLibrary();
    } catch (deleteError) {
      setActionMessage(deleteError instanceof Error ? deleteError.message : 'Selected materials could not be deleted.');
    } finally {
      setBulkDeleting(false);
    }
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

  const reindexVectors = async () => {
    if (reindexingVectors) return;

    setReindexingVectors(true);
    setActionMessage('');

    try {
      const response = await fetch('/api/lectures/reindex', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not reindex vectors.');
      }

      setActionMessage(
        `Vector reindex complete: ${result.data.embeddedSegmentCount} embedded, ${result.data.remainingSegmentCount} remaining.`,
      );
      await loadLibrary({ silent: true });
    } catch (reindexError) {
      setActionMessage(reindexError instanceof Error ? reindexError.message : 'Could not reindex vectors.');
    } finally {
      setReindexingVectors(false);
    }
  };

  return (
    <div className="tool-shell">
      <header className="kb-hero">
        <div className="min-w-0">
          <p className="eyebrow">Library</p>
          <h1 className="kb-title">Knowledge base</h1>
          <p className="tool-subtitle">Organize lecture files and folders for source-grounded Chat.</p>
        </div>
        <div className="tool-actions">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input-field h-11 min-w-0 sm:w-80"
            placeholder={selectedFolder === 'root' ? 'Search folders' : 'Search files'}
          />
        </div>
      </header>

      <section className="drive-console">
        <main className="kb-board">
          <div className="board-toolbar">
            <div className="min-w-0">
              <nav className="drive-breadcrumb" aria-label="Library location">
                <button type="button" onClick={() => setSelectedFolder('root')} className="drive-breadcrumb-item">
                  Library
                </button>
                {breadcrumbFolders.map((folder) => (
                  <span key={folder.id} className="contents">
                    <span className="text-[#a3a3a3]">/</span>
                    {folder.id === activeFolder?.id ? (
                      <span className="drive-breadcrumb-current">{folder.name}</span>
                    ) : (
                      <button type="button" onClick={() => setSelectedFolder(folder.id)} className="drive-breadcrumb-item">
                        {folder.name}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
              <p className="mt-2 text-sm text-[#737373]">
                {activeFolder
                  ? `${currentFolders.length} folders · ${visibleItems.length} files`
                  : `${currentFolders.length} folders in your knowledge base`}
              </p>
            </div>
            <div className="board-toolbar-actions">
              {selectedLectureIds.length > 0 ? (
                <div className="bulk-action-bar">
                  <span>{selectedLectureIds.length} selected</span>
                  <button type="button" onClick={() => setShowBulkDelete(true)} className="text-link text-red-700">
                    Delete
                  </button>
                  <button type="button" onClick={() => setSelectedLectureIds([])} className="text-link">
                    Clear
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setNewFolderName('');
                  setNewItemMode('folder');
                  setShowNewFolder(true);
                }}
                className="btn-secondary h-10"
              >
                New
              </button>
              <div className="view-switcher" aria-label="Source view">
                {(['list', 'grid', 'compact'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={viewMode === mode ? 'view-switcher-button view-switcher-button-active' : 'view-switcher-button'}
                  >
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {actionMessage ? (
            <div className="mb-4 border-l-2 border-[#ff7759] bg-[#ffad9b]/20 px-4 py-3 text-sm text-[#000000]">
              {actionMessage}
            </div>
          ) : null}

          {hasIndexingSources ? (
            <div className="indexing-banner" role="status">
              <span className="indexing-dot" aria-hidden="true" />
              <span>Indexing source files. Chat will pick them up when they are ready.</span>
            </div>
          ) : null}

          {hasVectorReindexSources ? (
            <div className="indexing-banner" role="status">
              <span className="indexing-dot" aria-hidden="true" />
              <span>Some ready sources need vector indexing. Chat can still use lexical search.</span>
              <button type="button" onClick={reindexVectors} disabled={reindexingVectors} className="text-link">
                {reindexingVectors ? 'Reindexing...' : 'Reindex vectors'}
              </button>
            </div>
          ) : null}

          <section className="source-list">
            {loading && (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-md bg-[#fafafa]/60" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="empty-state">
                <h3>Could not load sources</h3>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && currentFolders.length === 0 && visibleItems.length === 0 && (
              <div className="empty-state">
                <h3>{activeFolder ? 'This folder is empty' : 'No folders yet'}</h3>
                <p>{activeFolder ? 'Add a folder or upload a source file here.' : 'Create a folder to start organizing lecture PDFs and notes for Chat.'}</p>
                <button
                  type="button"
                  onClick={() => {
                    setNewItemMode('folder');
                    setShowNewFolder(true);
                  }}
                  className="btn-primary mt-5"
                >
                  New
                </button>
              </div>
            )}

            {!loading && !error && (currentFolders.length > 0 || visibleItems.length > 0) && viewMode === 'list' && (
              <div className="kb-source-list-head">
                <label className="bulk-select-control">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={visibleLectureIds.length === 0}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible files"
                  />
                </label>
                <span>Name</span>
                <span>Kind</span>
                <span>Details</span>
                <span>Updated</span>
                <span className="text-right">Manage</span>
              </div>
            )}

            {!loading && !error && (currentFolders.length > 0 || visibleItems.length > 0) && viewMode === 'list' && (
              <div className="divide-y divide-[#e5e5e5]">
                {currentFolders.map((folder) => (
                  <article key={folder.id} className="drive-row">
                    <span className="bulk-select-placeholder" />
                    <button type="button" onClick={() => setSelectedFolder(folder.id)} className="drive-row-main">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#000000]">{folder.name}</span>
                        <span className="mt-1 block text-xs text-[#737373]">
                          {folder.folderCount || 0} folders · {folder.documentCount} files
                        </span>
                      </span>
                    </button>
                    <span className="hidden text-sm text-[#737373] sm:inline">Folder</span>
                    <span className="hidden text-sm text-[#737373] lg:inline">{folder.folderCount || 0} folders · {folder.documentCount} files</span>
                    <span className="hidden text-sm text-[#737373] lg:inline">—</span>
                    <span className="drive-action-group">
                      <button type="button" onClick={() => renameFolder(folder)} className="text-link">
                        Rename
                      </button>
                      <button type="button" onClick={() => deleteFolder(folder)} className="text-link text-red-700">
                        Delete
                      </button>
                    </span>
                  </article>
                ))}
                {visibleItems.map((document) => (
                  <article key={document.id} className="kb-source-row">
                    <label className="bulk-select-control">
                      <input
                        type="checkbox"
                        checked={selectedLectureIds.includes(document.id)}
                        onChange={() => toggleLectureSelection(document.id)}
                        aria-label={`Select ${document.title}`}
                      />
                    </label>
                    <Link href={`/documents/${document.id}`} className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#000000]">{document.title}</div>
                      <div className="mt-1 truncate text-sm text-[#737373]">
                        {document.originalName} · {document.fileSize}
                      </div>
                    </Link>
                    <span className="text-sm text-[#737373]">{document.type}</span>
                    <span className="flex min-w-0 flex-wrap gap-2">
                      <span className={document.status === 'Processed' ? 'status-pill status-ready' : 'status-pill'}>
                        {formatSourceStatus(document.status)} · {document.segments} passages
                      </span>
                      <span className={document.vectorStatus === 'Vector ready' ? 'status-pill status-ready' : 'status-pill status-muted'}>
                        {document.vectorStatus}
                      </span>
                    </span>
                    <span className="text-sm text-[#737373]">{document.uploadedAt}</span>
                    <span className="drive-action-group">
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

            {!loading && !error && (currentFolders.length > 0 || visibleItems.length > 0) && viewMode === 'grid' && (
              <div className="kb-source-grid">
                {currentFolders.map((folder) => (
                  <article key={folder.id} className="drive-folder-card">
                    <button type="button" onClick={() => setSelectedFolder(folder.id)} className="block w-full text-left">
                      <span className="drive-folder-mark" />
                      <span className="mt-5 block line-clamp-2 text-left text-sm font-medium leading-5 text-[#000000]">{folder.name}</span>
                      <span className="mt-2 block text-left text-xs text-[#737373]">
                        {folder.folderCount || 0} folders · {folder.documentCount} files
                      </span>
                    </button>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e5e5e5] pt-3">
                      <span className="text-xs text-[#737373]">Folder</span>
                      <span className="drive-action-group">
                        <button type="button" onClick={() => renameFolder(folder)} className="text-link">
                          Rename
                        </button>
                        <button type="button" onClick={() => deleteFolder(folder)} className="text-link text-red-700">
                          Delete
                        </button>
                      </span>
                    </div>
                  </article>
                ))}
                {visibleItems.map((document) => (
                  <article key={document.id} className={selectedLectureIds.includes(document.id) ? 'kb-source-card kb-source-card-selected' : 'kb-source-card'}>
                    <label className="bulk-card-check">
                      <input
                        type="checkbox"
                        checked={selectedLectureIds.includes(document.id)}
                        onChange={() => toggleLectureSelection(document.id)}
                        aria-label={`Select ${document.title}`}
                      />
                    </label>
                    <Link href={`/documents/${document.id}`} className="min-w-0">
                      <div className="kb-source-card-icon">PDF</div>
                      <h3 className="mt-4 line-clamp-2 text-sm font-medium leading-5 text-[#000000]">{document.title}</h3>
                      <p className="mt-2 truncate text-xs text-[#737373]">{document.originalName}</p>
                    </Link>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={document.status === 'Processed' ? 'status-pill status-ready' : 'status-pill'}>
                        {formatSourceStatus(document.status)}
                      </span>
                      <span className="status-pill status-muted">{document.segments} passages</span>
                      <span className={document.vectorStatus === 'Vector ready' ? 'status-pill status-ready' : 'status-pill status-muted'}>
                        {document.vectorStatus}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e5e5e5] pt-3">
                      <span className="min-w-0 truncate text-xs text-[#737373]">{document.folderName}</span>
                      <span className="drive-action-group">
                        <button type="button" onClick={() => renameLecture(document.id, document.title)} className="text-link">
                          Rename
                        </button>
                        <button type="button" onClick={() => deleteLecture(document.id, document.title)} className="text-link text-red-700">
                          Delete
                        </button>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loading && !error && (currentFolders.length > 0 || visibleItems.length > 0) && viewMode === 'compact' && (
              <div className="divide-y divide-[#e5e5e5]">
                {currentFolders.map((folder) => (
                  <article key={folder.id} className="drive-compact-row">
                    <button type="button" onClick={() => setSelectedFolder(folder.id)} className="drive-compact-name text-left">
                      {folder.name}
                    </button>
                    <span className="hidden text-xs text-[#737373] sm:inline">Folder</span>
                    <span className="text-xs text-[#737373]">{folder.documentCount} files</span>
                    <span className="drive-action-group">
                      <button type="button" onClick={() => renameFolder(folder)} className="text-link">
                        Rename
                      </button>
                      <button type="button" onClick={() => deleteFolder(folder)} className="text-link text-red-700">
                        Delete
                      </button>
                    </span>
                  </article>
                ))}
                {visibleItems.map((document) => (
                  <article key={document.id} className="drive-compact-row">
                    <label className="bulk-select-control">
                      <input
                        type="checkbox"
                        checked={selectedLectureIds.includes(document.id)}
                        onChange={() => toggleLectureSelection(document.id)}
                        aria-label={`Select ${document.title}`}
                      />
                    </label>
                    <Link href={`/documents/${document.id}`} className="drive-compact-name">
                      {document.title}
                    </Link>
                    <span className="hidden text-xs text-[#737373] sm:inline">{document.type}</span>
                    <span className={document.status === 'Processed' ? 'status-pill status-ready' : 'status-pill'}>
                      {formatSourceStatus(document.status)}
                    </span>
                    <span className="hidden text-xs text-[#737373] lg:inline">{document.vectorStatus}</span>
                    <span className="drive-action-group">
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt"
        className="hidden"
        onChange={(event) => event.target.files && handleFiles(event.target.files)}
      />

      {showUploadPanel ? (
        <div className="modal-backdrop">
          <section className="kb-upload-modal">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
              <div className="min-w-0">
                <p className="eyebrow">Add source</p>
                <h2 className="mt-2 text-2xl font-medium leading-tight text-[#000000]">Upload to knowledge base</h2>
                <p className="mt-2 text-sm leading-6 text-[#737373]">
                  New files will be parsed into source passages and become available to Chat after indexing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadPanel(false);
                  setIsDragActive(false);
                }}
                className="modal-close-button"
                aria-label="Close upload modal"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
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
                  <p className="text-sm font-medium text-[#000000]">
                    Target folder: {activeFolder?.name || 'open a folder first'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#737373]">
                    Drop PDF or TXT files here, or choose files from your computer.
                  </p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary shrink-0">
                  Choose files
                </button>
              </div>

              {uploadProgress.length > 0 ? (
                <div className="mt-5 divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
                  {uploadProgress.map((item) => (
                    <div key={item.fileName} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#000000]">{item.fileName}</div>
                        {item.error ? <div className="mt-1 text-sm text-red-700">{item.error}</div> : null}
                      </div>
                      <span className={item.status === 'success' ? 'status-pill status-ready' : item.status === 'error' ? 'status-pill status-error' : 'status-pill'}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[#e5e5e5] pt-4">
              <p className="text-xs text-[#737373]">Supported now: PDF and TXT</p>
              <button
                type="button"
                onClick={() => setShowUploadPanel(false)}
                className="btn-secondary"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showNewFolder ? (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-lg">
            <p className="text-xs uppercase tracking-normal text-[#737373]">New</p>
            <h2 className="mt-2 text-xl font-normal text-[#000000]">
              Add to {activeFolder?.name || 'Library'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#737373]">
              Create a nested folder here or upload source files into the current folder.
            </p>
            <div className="view-switcher mt-5">
              {(['folder', 'file'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNewItemMode(mode)}
                  className={newItemMode === mode ? 'view-switcher-button view-switcher-button-active' : 'view-switcher-button'}
                >
                  {mode === 'folder' ? 'Folder' : 'File'}
                </button>
              ))}
            </div>

            {newItemMode === 'folder' ? (
              <input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && createFolder()}
                className="input-field mt-5"
                placeholder="Folder name"
                autoFocus
              />
            ) : (
              <div className="mt-5">
                {!activeFolder ? (
                  <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-4 text-sm leading-6 text-[#737373]">
                    Open or create a folder before uploading source files.
                  </div>
                ) : (
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
                      <p className="text-sm font-medium text-[#000000]">Target folder: {activeFolder.name}</p>
                      <p className="mt-1 text-sm leading-6 text-[#737373]">
                        Drop PDF or TXT files here, or choose files from your computer.
                      </p>
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary shrink-0">
                      Choose files
                    </button>
                  </div>
                )}
              </div>
            )}

            {uploadProgress.length > 0 && newItemMode === 'file' ? (
              <div className="mt-5 divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
                {uploadProgress.map((item) => (
                  <div key={item.fileName} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#000000]">{item.fileName}</div>
                      {item.error ? <div className="mt-1 text-sm text-red-700">{item.error}</div> : null}
                    </div>
                    <span className={item.status === 'success' ? 'status-pill status-ready' : item.status === 'error' ? 'status-pill status-error' : 'status-pill'}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                  setNewItemMode('folder');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              {newItemMode === 'folder' ? (
                <button type="button" onClick={createFolder} className="btn-primary">
                  Create folder
                </button>
              ) : (
                <button type="button" onClick={() => setShowNewFolder(false)} className="btn-primary">
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showBulkDelete ? (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-lg">
            <p className="text-xs uppercase tracking-normal text-[#737373]">Delete selected</p>
            <h2 className="mt-2 text-xl font-normal text-[#000000]">
              Delete {selectedLectureIds.length} selected {selectedLectureIds.length === 1 ? 'file' : 'files'}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#737373]">
              This removes the source files, parsed passages, and generated study data connected to them.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDelete(false)}
                disabled={bulkDeleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={bulkDeleteLectures}
                disabled={bulkDeleting}
                className="btn-primary bg-red-700 hover:bg-red-800"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete files'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
