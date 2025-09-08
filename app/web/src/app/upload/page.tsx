/**
 * 文档上传页面
 * 保持与Dashboard一致的极简设计风格
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';

// 类型定义
interface Folder {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// 支持的文件类型
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态管理
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载文件夹列表
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        setFolders(result.data || []);
        // 默认选择第一个文件夹
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

  // 创建新文件夹
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
        setFolders(prev => [result.data, ...prev]);
        setSelectedFolderId(result.data.id);
        setNewFolderName('');
        setShowNewFolder(false);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  // 文件验证
  const validateFile = (file: File): string | null => {
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return '不支持的文件类型。请上传 PDF、PPTX 或 TXT 文件。';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小超过限制。最大支持 100MB。';
    }
    return null;
  };

  // 上传文件
  const uploadFile = async (file: File) => {
    console.log('🚀 开始上传文件:', file.name, 'size:', file.size, 'type:', file.type);
    
    if (!selectedFolderId) {
      alert('请先选择文件夹');
      return;
    }

    const validation = validateFile(file);
    if (validation) {
      console.log('❌ 文件验证失败:', validation);
      setUploadProgress(prev => [...prev, {
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: validation
      }]);
      return;
    }

    // 添加上传进度
    setUploadProgress(prev => [...prev, {
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      console.log('📤 构建FormData，选择的文件夹ID:', selectedFolderId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', selectedFolderId);

      console.log('🌐 发送请求到 /api/lectures...');
      const response = await fetch('/api/lectures', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 服务器响应状态:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 上传成功:', result);
        setUploadProgress(prev => 
          prev.map(item => 
            item.fileName === file.name 
              ? { ...item, progress: 100, status: 'success' }
              : item
          )
        );
      } else {
        const errorText = await response.text();
        console.log('❌ 服务器响应错误:', response.status, errorText);
        
        let errorMessage = '上传失败';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || '上传失败';
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        setUploadProgress(prev => 
          prev.map(item => 
            item.fileName === file.name 
              ? { ...item, status: 'error', error: errorMessage }
              : item
          )
        );
      }
    } catch (error) {
      console.log('❌ 网络错误或异常:', error);
      const errorMessage = error instanceof Error 
        ? `网络错误: ${error.message}` 
        : '网络连接失败，请检查服务器状态';
        
      setUploadProgress(prev => 
        prev.map(item => 
          item.fileName === file.name 
            ? { ...item, status: 'error', error: errorMessage }
            : item
        )
      );
    }
  };

  // 处理文件选择
  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach(uploadFile);
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 极简页面标题 - 与Dashboard保持一致 */}
        <div className="mb-12">
          <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
            UPLOAD
          </div>
          <h1 className="text-3xl font-light text-black mb-4">文档上传</h1>
          <p className="text-gray-600 text-lg">
            上传 PDF、PPTX 或 TXT 文档，开始您的智能学习体验
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 文件夹选择 */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">选择文件夹</h2>
                <button
                  onClick={() => setShowNewFolder(!showNewFolder)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + 新建
                </button>
              </div>

              {/* 新建文件夹输入 */}
              {showNewFolder && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="文件夹名称"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-green-500"
                      onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                    />
                    <button
                      onClick={createFolder}
                      className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      创建
                    </button>
                  </div>
                </div>
              )}

              {/* 文件夹列表 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`p-3 border rounded cursor-pointer transition-all duration-200 ${
                        selectedFolderId === folder.id
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{folder.name}</div>
                          {folder.description && (
                            <div className="text-xs text-gray-500 mt-1">{folder.description}</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {folder.documentCount || 0} 文档
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 上传区域 */}
          <div className="lg:col-span-2">
            <div className="card">
              {/* 拖拽上传区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive 
                    ? 'border-green-500 bg-green-50' 
                    : selectedFolderId 
                      ? 'border-gray-300 hover:border-green-500' 
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-4xl mb-4">📤</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedFolderId ? '拖拽文件到此处上传' : '请先选择文件夹'}
                </h3>
                <p className="text-gray-600 mb-4">
                  支持 PDF、PPTX、TXT 格式，最大 100MB
                </p>
                
                {selectedFolderId && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!selectedFolderId}
                      className="btn-primary"
                    >
                      选择文件上传
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.pptx,.txt"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    />
                  </>
                )}
              </div>

              {/* 上传进度 */}
              {uploadProgress.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">上传进度</h3>
                  {uploadProgress.map((item, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {item.fileName}
                        </span>
                        <span className={`text-xs ${
                          item.status === 'success' ? 'text-green-600' :
                          item.status === 'error' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {item.status === 'success' ? '✓ 完成' :
                           item.status === 'error' ? '✗ 失败' :
                           '上传中...'}
                        </span>
                      </div>
                      
                      {item.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {item.error && (
                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                      )}
                    </div>
                  ))}
                  
                  {uploadProgress.some(item => item.status === 'success') && (
                    <div className="pt-3 border-t">
                      <button
                        onClick={() => router.push('/library')}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        查看文档库 →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-12">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📄 支持格式</h3>
                <ul className="space-y-1">
                  <li>• PDF 文档</li>
                  <li>• PPTX 演示文稿</li>
                  <li>• TXT 文本文件</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📏 文件限制</h3>
                <ul className="space-y-1">
                  <li>• 最大文件大小: 100MB</li>
                  <li>• 支持批量上传</li>
                  <li>• 自动文件验证</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🔄 处理流程</h3>
                <ul className="space-y-1">
                  <li>• 文件上传到存储</li>
                  <li>• 自动内容解析</li>
                  <li>• 生成学习材料</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}