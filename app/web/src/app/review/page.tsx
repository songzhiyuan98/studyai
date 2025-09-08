/**
 * 内容审查页面
 * 展示和管理所有AI生成的学习内容
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '内容审查',
  description: '查看、编辑和管理所有AI生成的学习内容',
};

// 模拟生成内容数据
const reviewItems = [
  {
    id: 'review_1',
    type: 'translation',
    title: '监督学习概念翻译',
    content: 'Supervised learning is a type of machine learning where algorithms are trained on labeled training data. The training data contains input features and corresponding correct output labels. The goal of the algorithm is to learn a function that can map new inputs to correct outputs.',
    originalContent: '监督学习是机器学习的一种类型，其中算法在标记的训练数据上进行训练。训练数据包含输入特征和相应的正确输出标签。算法的目标是学习一个函数，该函数可以将新的输入映射到正确的输出。',
    sourceDocument: '机器学习基础',
    sourceSegments: ['seg_2'],
    createdAt: '2025-01-08 14:30',
    status: 'pending',
    quality: 'high',
  },
  {
    id: 'review_2',
    type: 'summary',
    title: '机器学习基础摘要',
    content: '机器学习是AI的一个分支，通过算法和统计模型让计算机在无明确编程情况下执行特定任务。主要类型包括监督学习（使用标记数据）和无监督学习（发现隐藏模式）。',
    originalContent: '',
    sourceDocument: '机器学习基础',
    sourceSegments: ['seg_1', 'seg_2', 'seg_3'],
    createdAt: '2025-01-08 14:25',
    status: 'approved',
    quality: 'high',
  },
  {
    id: 'review_3',
    type: 'terms',
    title: '关键术语表',
    content: '监督学习 (Supervised Learning): 使用标记训练数据的机器学习方法\n无监督学习 (Unsupervised Learning): 不使用标记数据，寻找数据中隐藏模式的方法\n聚类 (Clustering): 将数据点分组的无监督学习技术',
    originalContent: '',
    sourceDocument: '机器学习基础',
    sourceSegments: ['seg_2', 'seg_3'],
    createdAt: '2025-01-08 14:35',
    status: 'pending',
    quality: 'medium',
  },
  {
    id: 'review_4',
    type: 'exam',
    title: '监督学习测试题',
    content: '1. 监督学习的主要特征是什么？\nA) 不需要训练数据 B) 使用标记的训练数据 C) 只能处理数值数据 D) 不需要输出标签\n\n2. 监督学习算法的目标是什么？\nA) 减少数据量 B) 学习输入到输出的映射函数 C) 增加数据复杂性 D) 删除异常值',
    originalContent: '',
    sourceDocument: '机器学习基础',
    sourceSegments: ['seg_2'],
    createdAt: '2025-01-08 14:40',
    status: 'needs_revision',
    quality: 'medium',
  },
];

// 内容类型配置
const contentTypeConfig = {
  translation: { 
    icon: '🌐', 
    name: '翻译', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  summary: { 
    icon: '📄', 
    name: '摘要', 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  terms: { 
    icon: '📝', 
    name: '术语表', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  exam: { 
    icon: '📋', 
    name: '考试题', 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
};

// 状态配置
const statusConfig = {
  pending: { color: 'text-yellow-600', bg: 'bg-yellow-100', text: '待审查' },
  approved: { color: 'text-green-600', bg: 'bg-green-100', text: '已通过' },
  needs_revision: { color: 'text-red-600', bg: 'bg-red-100', text: '需修改' },
  rejected: { color: 'text-gray-600', bg: 'bg-gray-100', text: '已拒绝' },
};

// 质量评级配置
const qualityConfig = {
  high: { color: 'text-green-600', text: '高质量' },
  medium: { color: 'text-yellow-600', text: '中等' },
  low: { color: 'text-red-600', text: '需改进' },
};

// 审查项目卡片组件
const ReviewItemCard = ({ item }: { item: typeof reviewItems[0] }) => {
  const typeConfig = contentTypeConfig[item.type as keyof typeof contentTypeConfig];
  const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
  const qualityInfo = qualityConfig[item.quality as keyof typeof qualityConfig];

  return (
    <div className={`card hover:shadow-lg transition-all duration-200 ${typeConfig.borderColor} border-l-4`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 ${typeConfig.bgColor} rounded`}>
            <span className="text-lg">{typeConfig.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {item.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
              <span className={typeConfig.color}>{typeConfig.name}</span>
              <span>来源: {item.sourceDocument}</span>
              <span>{item.createdAt}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 text-xs rounded ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
          <span className={`text-xs ${qualityInfo.color}`}>
            {qualityInfo.text}
          </span>
        </div>
      </div>

      {/* 内容展示 */}
      <div className="mb-4">
        <div className="bg-gray-50 p-4 rounded text-sm">
          <p className="text-gray-900 leading-relaxed whitespace-pre-line">
            {item.content}
          </p>
        </div>
        {item.originalContent && (
          <div className="mt-3 bg-blue-50 p-3 rounded text-sm">
            <div className="text-xs text-blue-600 mb-2">原文:</div>
            <p className="text-gray-700 leading-relaxed">
              {item.originalContent}
            </p>
          </div>
        )}
      </div>

      {/* 源片段信息 */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">源片段:</div>
        <div className="flex flex-wrap gap-2">
          {item.sourceSegments.map((segId) => (
            <span 
              key={segId}
              className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
            >
              {segId}
            </span>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          {item.status === 'pending' && (
            <>
              <button className="btn-primary text-sm px-3 py-1">
                批准
              </button>
              <button className="btn-secondary text-sm px-3 py-1">
                需修改
              </button>
            </>
          )}
          {item.status === 'approved' && (
            <span className="text-sm text-green-600">✓ 已批准</span>
          )}
          {item.status === 'needs_revision' && (
            <button className="btn-primary text-sm px-3 py-1">
              重新生成
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button className="text-sm text-gray-500 hover:text-gray-700">
            编辑
          </button>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            导出
          </button>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

// 筛选标签组件
const FilterTab = ({ 
  label, 
  count, 
  active = false,
  onClick
}: { 
  label: string; 
  count: number; 
  active?: boolean;
  onClick?: () => void;
}) => (
  <button 
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      active 
        ? 'text-green-600 border-b-2 border-green-600' 
        : 'text-gray-600 hover:text-gray-900'
    }`}
    onClick={onClick}
  >
    {label} ({count})
  </button>
);

export default function ReviewPage() {
  const stats = {
    total: reviewItems.length,
    pending: reviewItems.filter(item => item.status === 'pending').length,
    approved: reviewItems.filter(item => item.status === 'approved').length,
    needsRevision: reviewItems.filter(item => item.status === 'needs_revision').length,
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* 极简页面标题 */}
        <div className="mb-12">
          <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
            CONTENT REVIEW
          </div>
          <h1 className="text-3xl font-light text-black mb-4">内容审查</h1>
          <p className="text-gray-600 text-lg">
            查看、编辑和管理所有AI生成的学习内容
          </p>
        </div>

        {/* 统计概览 */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-light text-black mb-1">{stats.total}</div>
            <div className="text-sm text-gray-600">总内容数</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-light text-yellow-600 mb-1">{stats.pending}</div>
            <div className="text-sm text-gray-600">待审查</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-light text-green-600 mb-1">{stats.approved}</div>
            <div className="text-sm text-gray-600">已通过</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-light text-red-600 mb-1">{stats.needsRevision}</div>
            <div className="text-sm text-gray-600">需修改</div>
          </div>
        </div>

        {/* 筛选和操作栏 */}
        <div className="flex justify-between items-center mb-8">
          {/* 筛选标签 */}
          <div className="flex items-center space-x-6">
            <FilterTab label="全部" count={stats.total} active={true} />
            <FilterTab label="待审查" count={stats.pending} />
            <FilterTab label="已通过" count={stats.approved} />
            <FilterTab label="需修改" count={stats.needsRevision} />
          </div>

          {/* 批量操作 */}
          <div className="flex items-center space-x-3">
            <button className="btn-secondary px-4 py-2 text-sm">
              批量批准
            </button>
            <button className="btn-secondary px-4 py-2 text-sm">
              批量导出
            </button>
          </div>
        </div>

        {/* 内容列表 */}
        <div className="space-y-6">
          {reviewItems.map((item) => (
            <ReviewItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* 分页 */}
        <div className="flex justify-center mt-12">
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              上一页
            </button>
            <button className="px-3 py-2 text-sm bg-green-500 text-white">
              1
            </button>
            <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              2
            </button>
            <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              3
            </button>
            <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}