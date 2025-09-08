/**
 * 文档阅读器页面
 * 显示文档内容，支持文本选择和片段管理
 */

import type { Metadata } from 'next';

// 动态页面元数据
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    title: '文档阅读器',
    description: `查看和管理文档 ID: ${params.id}`,
  };
}

// 模拟文档数据
const documentData = {
  id: '1',
  title: '机器学习基础',
  type: 'PDF',
  totalPages: 25,
  uploadDate: '2025-01-08',
  status: 'processed',
  segments: [
    {
      id: 'seg_1',
      pageNumber: 1,
      content: '机器学习是人工智能的一个分支，它专注于开发算法和统计模型，使计算机能够在没有明确编程的情况下执行特定任务。这种技术的核心思想是让机器通过数据学习模式和做出预测。',
      startChar: 0,
      endChar: 89,
      selected: false,
    },
    {
      id: 'seg_2', 
      pageNumber: 1,
      content: '监督学习是机器学习的一种类型，其中算法在标记的训练数据上进行训练。训练数据包含输入特征和相应的正确输出标签。算法的目标是学习一个函数，该函数可以将新的输入映射到正确的输出。',
      startChar: 90,
      endChar: 189,
      selected: true,
    },
    {
      id: 'seg_3',
      pageNumber: 2, 
      content: '无监督学习不使用标记的训练数据。相反，算法尝试在数据中找到隐藏的模式或结构。聚类和降维是无监督学习的常见应用。',
      startChar: 0,
      endChar: 79,
      selected: false,
    },
  ],
};

// 模拟生成的学习内容
const generatedItems = [
  {
    id: 'item_1',
    type: 'translation',
    title: '翻译',
    content: 'Supervised learning is a type of machine learning where algorithms are trained on labeled training data...',
    sourceSegments: ['seg_2'],
    createdAt: '2025-01-08 14:30',
  },
  {
    id: 'item_2',
    type: 'summary',
    title: '摘要',
    content: '监督学习通过标记数据训练算法，学习输入到输出的映射函数，用于对新数据进行预测。',
    sourceSegments: ['seg_2'],
    createdAt: '2025-01-08 14:32',
  },
];

// 文档段落组件
const DocumentSegment = ({ 
  segment, 
  onToggleSelect 
}: { 
  segment: typeof documentData.segments[0];
  onToggleSelect: (id: string) => void;
}) => (
  <div 
    className={`p-4 border rounded cursor-pointer transition-all duration-200 ${
      segment.selected 
        ? 'border-green-500 bg-green-50' 
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
    onClick={() => onToggleSelect(segment.id)}
  >
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs text-gray-500">
        第 {segment.pageNumber} 页 · 片段 {segment.id}
      </span>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={segment.selected}
          onChange={() => onToggleSelect(segment.id)}
          className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
        />
      </div>
    </div>
    <p className="text-gray-900 leading-relaxed">
      {segment.content}
    </p>
  </div>
);

// 生成内容卡片
const GeneratedItemCard = ({ item }: { item: typeof generatedItems[0] }) => {
  const typeConfig = {
    translation: { icon: '🌐', name: '翻译', color: 'text-blue-600' },
    summary: { icon: '📄', name: '摘要', color: 'text-green-600' },
    terms: { icon: '📝', name: '术语', color: 'text-purple-600' },
    exam: { icon: '📋', name: '考题', color: 'text-orange-600' },
  };

  const config = typeConfig[item.type as keyof typeof typeConfig];

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`text-sm font-medium ${config.color}`}>
            {config.name}
          </span>
        </div>
        <span className="text-xs text-gray-500">{item.createdAt}</span>
      </div>
      <p className="text-gray-900 text-sm leading-relaxed mb-3">
        {item.content}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          源片段: {item.sourceSegments.join(', ')}
        </span>
        <div className="flex items-center space-x-2">
          <button className="text-xs text-gray-500 hover:text-gray-700">
            编辑
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700">
            导出
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DocumentReaderPage({ params }: { params: { id: string } }) {
  const selectedCount = documentData.segments.filter(seg => seg.selected).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 文档标题区域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-gray-400 mb-2 tracking-wider">
                DOCUMENT READER
              </div>
              <h1 className="text-2xl font-light text-black mb-2">
                {documentData.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{documentData.type}</span>
                <span>{documentData.totalPages} 页</span>
                <span>上传于 {documentData.uploadDate}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="btn-secondary px-4 py-2">
                下载原文
              </button>
              <button className="btn-primary px-4 py-2">
                生成内容
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 文档内容区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 选择状态栏 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border rounded">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  已选择 {selectedCount} / {documentData.segments.length} 个片段
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  全选
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  清除
                </button>
                <button className="btn-primary text-sm px-4 py-2">
                  生成学习内容
                </button>
              </div>
            </div>

            {/* 文档片段列表 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">文档片段</h3>
              {documentData.segments.map((segment) => (
                <DocumentSegment 
                  key={segment.id} 
                  segment={segment}
                  onToggleSelect={(id: string) => {
                    // 这里会在实际应用中处理选择状态
                    console.log('Toggle segment:', id);
                  }}
                />
              ))}
            </div>
          </div>

          {/* 侧边面板 */}
          <div className="space-y-6">
            {/* 生成选项 */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                生成选项
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    翻译内容
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    内容摘要
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    关键术语
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    练习题目
                  </span>
                </label>
              </div>
            </div>

            {/* 已生成内容 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                已生成内容
              </h3>
              <div className="space-y-4">
                {generatedItems.map((item) => (
                  <GeneratedItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* 文档统计 */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                文档统计
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">总片段数</span>
                  <span className="text-sm font-medium">{documentData.segments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">已选择</span>
                  <span className="text-sm font-medium text-green-600">{selectedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">生成内容</span>
                  <span className="text-sm font-medium">{generatedItems.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}