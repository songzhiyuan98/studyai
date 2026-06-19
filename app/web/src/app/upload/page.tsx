'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Folder {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        setFolders(result.data || []);
        if (result.data?.length > 0) {
          setSelectedFolderId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        setFolders((current) => [result.data, ...current]);
        setSelectedFolderId(result.data.id);
        setNewFolderName('');
        setShowNewFolder(false);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return 'Only PDF, PPTX, and TXT files are supported.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is larger than 100MB.';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    if (!selectedFolderId) {
      return;
    }

    const validation = validateFile(file);
    if (validation) {
      setUploadProgress((current) => [...current, { fileName: file.name, progress: 0, status: 'error', error: validation }]);
      return;
    }

    setUploadProgress((current) => [...current, { fileName: file.name, progress: 0, status: 'uploading' }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', selectedFolderId);

      const response = await fetch('/api/lectures', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadProgress((current) =>
          current.map((item) =>
            item.fileName === file.name ? { ...item, progress: 100, status: 'success' } : item,
          ),
        );
        return;
      }

      const errorText = await response.text();
      let errorMessage = 'Upload failed.';
      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed.error || parsed.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      setUploadProgress((current) =>
        current.map((item) =>
          item.fileName === file.name ? { ...item, status: 'error', error: errorMessage } : item,
        ),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error.';
      setUploadProgress((current) =>
        current.map((item) =>
          item.fileName === file.name ? { ...item, status: 'error', error: errorMessage } : item,
        ),
      );
    }
  };

  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach(uploadFile);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    if (event.dataTransfer.files.length > 0) {
      handleFileSelect(event.dataTransfer.files);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Upload</p>
        <h1 className="page-title">Add lecture material</h1>
        <p className="page-description">
          Upload course files into a folder. The current backend stores files and creates lecture records; real source parsing is the next RAG milestone.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card h-fit">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Destination folder</h2>
            <button type="button" onClick={() => setShowNewFolder((value) => !value)} className="text-sm font-medium text-blue-600">
              New
            </button>
          </div>

          {showNewFolder && (
            <div className="mb-4 space-y-2 rounded-md bg-gray-50 p-3">
              <input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && createFolder()}
                className="input-field"
                placeholder="Folder name"
              />
              <button type="button" onClick={createFolder} className="btn-primary w-full">
                Create folder
              </button>
            </div>
          )}

          <div className="space-y-1">
            {loading ? (
              <div className="h-20 rounded-md bg-gray-100" />
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                    selectedFolderId === folder.id ? 'bg-gray-100 text-gray-950' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{folder.name}</span>
                  <span className="text-xs text-gray-400">{folder.documentCount || 0}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="card">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={handleDrop}
              className={`rounded-lg border border-dashed p-10 text-center transition-colors ${
                isDragActive ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <h2 className="text-base font-medium text-gray-950">
                {selectedFolderId ? 'Drop lecture files here' : 'Choose a folder first'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                PDF, PPTX, or TXT. Up to 100MB per file.
              </p>
              {selectedFolderId && (
                <>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-primary mt-5">
                    Select files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.pptx,.txt"
                    className="hidden"
                    onChange={(event) => event.target.files && handleFileSelect(event.target.files)}
                  />
                </>
              )}
            </div>
          </div>

          {uploadProgress.length > 0 && (
            <div className="surface overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="section-title">Upload status</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {uploadProgress.map((item) => (
                  <div key={item.fileName} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-gray-950">{item.fileName}</span>
                      <span className={item.status === 'success' ? 'chip-blue' : item.status === 'error' ? 'chip bg-red-50 text-red-700' : 'chip'}>
                        {item.status}
                      </span>
                    </div>
                    {item.status === 'uploading' && (
                      <div className="mt-3 h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.error && <p className="mt-2 text-sm text-red-600">{item.error}</p>}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 px-5 py-4">
                <button type="button" onClick={() => router.push('/library')} className="btn-secondary">
                  Open library
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
