/**
 * 文档库页面
 * 极简风格的文档管理界面，支持文件夹导航
 */
'use client';

import { useState } from 'react';

// 文件夹和文档数据结构
interface Folder {
  id: string;
  name: string;
  documentCount: number;
}

interface Document {
  id: number;
  title: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'processed' | 'processing' | 'error';
  icon: string;
  segments: number;
  generatedItems: number;
  folderId: string;
}

// 模拟数据
const mockFolders: Folder[] = [
  { id: 'all', name: '全部文档', documentCount: 6 },
  { id: '1', name: '机器学习课程', documentCount: 2 },
  { id: '2', name: '数据结构', documentCount: 1 },
  { id: '3', name: '算法分析', documentCount: 2 },
  { id: '4', name: '深度学习', documentCount: 1 },
];

const mockDocuments: Document[] = [
  {
    id: 1,
    title: '机器学习基础',
    type: 'PDF',
    size: '2.4 MB',
    uploadDate: '2025-01-08',
    status: 'processed',
    icon: '📄',
    segments: 45,
    generatedItems: 12,
    folderId: '1',
  },
  {
    id: 2,
    title: '深度学习课程',
    type: 'PPTX',
    size: '15.8 MB',
    uploadDate: '2025-01-07',
    status: 'processed',
    icon: '📊',
    segments: 128,
    generatedItems: 35,
    folderId: '4',
  },
  {
    id: 3,
    title: '课堂笔记',
    type: 'TXT',
    size: '156 KB',
    uploadDate: '2025-01-06',
    status: 'processing',
    icon: '📝',
    segments: 23,
    generatedItems: 0,
    folderId: '2',
  },
  {
    id: 4,
    title: '算法导论',
    type: 'PDF',
    size: '8.2 MB',
    uploadDate: '2025-01-05',
    status: 'processed',
    icon: '📄',
    segments: 89,
    generatedItems: 28,
    folderId: '3',
  },
  {
    id: 5,
    title: '神经网络原理',
    type: 'PDF',
    size: '4.1 MB',
    uploadDate: '2025-01-04',
    status: 'processed',
    icon: '📄',
    segments: 67,
    generatedItems: 18,
    folderId: '1',
  },
  {
    id: 6,
    title: '动态规划专题',
    type: 'PDF',
    size: '3.2 MB',
    uploadDate: '2025-01-03',
    status: 'processed',
    icon: '📄',
    segments: 42,
    generatedItems: 15,
    folderId: '3',
  },
];

// 文件夹侧边栏组件
const FolderSidebar = ({ 
  folders, 
  selectedFolderId, 
  onFolderSelect 
}: {
  folders: Folder[];
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
}) => {
  return (
    <div className="w-64 border-r border-gray-100 pr-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">文件夹</h3>
        <div className="space-y-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                selectedFolderId === folder.id
                  ? 'bg-green-50 border-green-200 border text-green-800'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm">
                  {folder.id === 'all' ? '📁' : '🗂️'}
                </span>
                <span className="text-sm font-medium">{folder.name}</span>
              </div>
              <span className="text-xs text-gray-500">
                {folder.documentCount}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 文档卡片组件
const DocumentCard = ({ doc }: { doc: Document }) => {
  const statusConfig = {
    processed: { color: 'text-green-600', text: '已处理' },
    processing: { color: 'text-yellow-600', text: '处理中' },
    error: { color: 'text-red-600', text: '错误' },
  };

  const status = statusConfig[doc.status];

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="text-2xl">{doc.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {doc.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{doc.type}</span>
              <span>{doc.size}</span>
              <span>{doc.uploadDate}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
              <span>{doc.segments} 个片段</span>
              <span>{doc.generatedItems} 项内容</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-xs ${status.color}`}>
            {status.text}
          </span>
          <div className="flex items-center space-x-2">
            <button className="text-gray-400 hover:text-gray-600 text-sm">
              查看
            </button>
            <button className="text-gray-400 hover:text-gray-600 text-sm">
              ⋮
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 筛选标签组件
const FilterTab = ({ label, count, active = false }: { 
  label: string; 
  count: number; 
  active?: boolean; 
}) => (
  <button className={`px-4 py-2 text-sm font-medium transition-colors ${
    active 
      ? 'text-green-600 border-b-2 border-green-600' 
      : 'text-gray-600 hover:text-gray-900'
  }`}>
    {label} ({count})
  </button>
);

export default function LibraryPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [folders] = useState<Folder[]>(mockFolders);
  const [documents] = useState<Document[]>(mockDocuments);

  // 根据选中的文件夹过滤文档
  const filteredDocuments = selectedFolderId === 'all' 
    ? documents 
    : documents.filter(doc => doc.folderId === selectedFolderId);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* 极简页面标题 - 与其他页面保持一致 */}
        <div className="mb-12">
          <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
            DOCUMENT LIBRARY
          </div>
          <h1 className="text-3xl font-light text-black mb-4">文档库</h1>
          <p className="text-gray-600 text-lg">
            管理和浏览您上传的所有学习文档
          </p>
        </div>

        <div className="flex gap-6">
          {/* 文件夹侧边栏 */}
          <FolderSidebar 
            folders={folders}
            selectedFolderId={selectedFolderId}
            onFolderSelect={setSelectedFolderId}
          />
          
          {/* 主内容区域 */}
          <div className="flex-1">
            {/* 当前文件夹信息 */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">
                    {selectedFolderId === 'all' ? '📁' : '🗂️'}
                  </span>
                  <h2 className="text-xl font-medium text-gray-900">
                    {selectedFolder?.name}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({filteredDocuments.length} 个文档)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-8">
              {/* 筛选标签 */}
              <div className="flex items-center space-x-8">
                <FilterTab label="全部" count={filteredDocuments.length} active={true} />
                <FilterTab label="已处理" count={filteredDocuments.filter(d => d.status === 'processed').length} />
                <FilterTab label="处理中" count={filteredDocuments.filter(d => d.status === 'processing').length} />
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center space-x-3">
                <button className="btn-secondary px-4 py-2 text-sm">
                  批量操作
                </button>
                <button className="btn-primary px-4 py-2 text-sm">
                  上传文档
                </button>
              </div>
            </div>

            {/* 搜索和排序 */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="搜索文档..."
                  className="w-full px-4 py-2.5 border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                />
              </div>
              <div className="flex items-center space-x-4 ml-6">
                <span className="text-sm text-gray-600">排序:</span>
                <select className="text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-green-500">
                  <option>最近上传</option>
                  <option>文件名</option>
                  <option>文件大小</option>
                  <option>处理状态</option>
                </select>
              </div>
            </div>

            {/* 文档列表 */}
            <div className="space-y-4 mb-8">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-gray-500">该文件夹中暂无文档</p>
                </div>
              )}
            </div>

            {/* 底部统计信息 */}
            <div className="border-t border-gray-100 pt-8">
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-light text-black mb-1">{filteredDocuments.length}</div>
                  <div className="text-sm text-gray-600">文档数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-black mb-1">
                    {filteredDocuments.reduce((sum, doc) => sum + doc.segments, 0)}
                  </div>
                  <div className="text-sm text-gray-600">文档片段</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-black mb-1">
                    {filteredDocuments.reduce((sum, doc) => sum + doc.generatedItems, 0)}
                  </div>
                  <div className="text-sm text-gray-600">生成内容</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-black mb-1">
                    {selectedFolderId === 'all' ? '33.7 MB' : '12.3 MB'}
                  </div>
                  <div className="text-sm text-gray-600">存储空间</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}