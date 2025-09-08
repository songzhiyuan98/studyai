'use client';

/**
 * 多文档学习准备页面
 * 支持选择多个文档，统一生成学习内容和模拟考试
 */

import { useState } from 'react';

// 数据结构定义
interface Folder {
  id: string;
  name: string;
  documentCount: number;
}

interface Document {
  id: string;
  title: string;
  type: string;
  pages: number;
  segments: number;
  uploadDate: string;
  topics: string[];
  folderId: string;
}

// 模拟文件夹数据
const mockFolders: Folder[] = [
  { id: '1', name: '机器学习课程', documentCount: 6 },
  { id: '2', name: '数据结构', documentCount: 1 },
  { id: '3', name: '算法分析', documentCount: 1 },
  { id: '4', name: '深度学习', documentCount: 1 },
];

// 模拟课程文档数据（带文件夹信息）
const initialDocuments: Document[] = [
  {
    id: 'lecture_1',
    title: 'Lecture 1: 机器学习导论',
    type: 'PDF',
    pages: 25,
    segments: 45,
    uploadDate: '2025-01-01',
    topics: ['机器学习定义', '监督学习', '无监督学习'],
    folderId: '1',
  },
  {
    id: 'lecture_2', 
    title: 'Lecture 2: 线性回归',
    type: 'PDF',
    pages: 32,
    segments: 58,
    uploadDate: '2025-01-03',
    topics: ['线性模型', '最小二乘法', '梯度下降'],
    folderId: '1',
  },
  {
    id: 'lecture_3',
    title: 'Lecture 3: 分类算法',
    type: 'PPTX',
    pages: 28,
    segments: 41,
    uploadDate: '2025-01-05',
    topics: ['逻辑回归', 'SVM', '决策树'],
    folderId: '1',
  },
  {
    id: 'lecture_4',
    title: 'Lecture 4: 神经网络基础',
    type: 'PDF',
    pages: 45,
    segments: 89,
    uploadDate: '2025-01-08',
    topics: ['感知机', '多层网络', '反向传播'],
    folderId: '1',
  },
  {
    id: 'lecture_5',
    title: 'Lecture 5: 深度学习',
    type: 'PDF',
    pages: 52,
    segments: 97,
    uploadDate: '2025-01-10',
    topics: ['CNN', 'RNN', 'Transformer'],
    folderId: '4',
  },
  {
    id: 'lecture_6',
    title: 'Lecture 6: 模型评估',
    type: 'PDF',
    pages: 18,
    segments: 34,
    uploadDate: '2025-01-12',
    topics: ['交叉验证', '性能指标', '过拟合'],
    folderId: '1',
  },
  {
    id: 'assignment_1',
    title: 'Assignment 1: 编程作业',
    type: 'TXT',
    pages: 5,
    segments: 12,
    uploadDate: '2025-01-15',
    topics: ['实现要求', '数据集', '评分标准'],
    folderId: '1',
  },
  {
    id: 'data_structure_intro',
    title: '数据结构导论',
    type: 'PDF',
    pages: 42,
    segments: 78,
    uploadDate: '2025-01-20',
    topics: ['数组', '链表', '栈与队列'],
    folderId: '2',
  },
  {
    id: 'algorithm_analysis',
    title: '算法分析基础',
    type: 'PDF',
    pages: 68,
    segments: 124,
    uploadDate: '2025-01-22',
    topics: ['时间复杂度', '空间复杂度', '大O记号'],
    folderId: '3',
  },
];

// 学习计划模板
const studyPlans = [
  {
    id: 'midterm',
    name: 'Midterm 期中考试',
    description: '覆盖前6周课程内容的综合复习',
    recommendedDocs: ['lecture_1', 'lecture_2', 'lecture_3', 'lecture_4', 'lecture_5', 'lecture_6'],
    duration: '2周',
    components: ['概念总结', '中英对照', '重点术语', '模拟考试'],
  },
  {
    id: 'final',
    name: 'Final 期末考试',
    description: '全课程内容复习，包含实践项目',
    recommendedDocs: ['lecture_1', 'lecture_2', 'lecture_3', 'lecture_4', 'lecture_5', 'lecture_6', 'assignment_1', 'reading_material'],
    duration: '3周',
    components: ['完整总结', '案例分析', '编程题库', '综合考试'],
  },
  {
    id: 'quiz',
    name: 'Weekly Quiz',
    description: '单周内容快速测验',
    recommendedDocs: ['lecture_1', 'lecture_2'], // 可动态选择
    duration: '30分钟',
    components: ['快速回顾', '选择题', '概念检查'],
  },
  {
    id: 'custom',
    name: '自定义学习',
    description: '根据个人需要选择内容',
    recommendedDocs: [],
    duration: '灵活',
    components: ['按需生成'],
  },
];

// 文件夹组件
const FolderGroup = ({
  folder,
  documents,
  selectedDocIds,
  onToggleDoc,
  expanded,
  onToggleExpand
}: {
  folder: Folder;
  documents: Document[];
  selectedDocIds: Set<string>;
  onToggleDoc: (id: string) => void;
  expanded: boolean;
  onToggleExpand: (folderId: string) => void;
}) => {
  const folderDocs = documents.filter(doc => doc.folderId === folder.id);
  const selectedCount = folderDocs.filter(doc => selectedDocIds.has(doc.id)).length;
  
  return (
    <div className="mb-6">
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
        onClick={() => onToggleExpand(folder.id)}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">🗂️</span>
          <h3 className="text-base font-medium text-gray-900">{folder.name}</h3>
          <span className="text-sm text-gray-500">
            ({folderDocs.length} 个文档)
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {selectedCount > 0 && (
            <span className="text-sm font-medium text-green-600">
              {selectedCount} 已选
            </span>
          )}
          <span className="text-gray-400">
            {expanded ? '▴' : '▾'}
          </span>
        </div>
      </div>
      
      {expanded && (
        <div className="space-y-3 mt-3 ml-4">
          {folderDocs.map((doc) => (
            <DocumentCard 
              key={doc.id}
              doc={doc}
              selected={selectedDocIds.has(doc.id)}
              onToggle={onToggleDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 文档卡片组件
const DocumentCard = ({ 
  doc, 
  selected, 
  onToggle 
}: { 
  doc: Document;
  selected: boolean;
  onToggle: (id: string) => void;
}) => (
  <div 
    className={`card cursor-pointer transition-all duration-200 ${
      selected 
        ? 'border-green-500 bg-green-50' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
    onClick={() => onToggle(doc.id)}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3 flex-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(doc.id)}
          className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {doc.title}
          </h3>
          <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
            <span>{doc.type}</span>
            <span>{doc.pages} 页</span>
            <span>{doc.segments} 段</span>
            <span>{doc.uploadDate}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {doc.topics.slice(0, 3).map((topic) => (
              <span 
                key={topic}
                className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
              >
                {topic}
              </span>
            ))}
            {doc.topics.length > 3 && (
              <span className="text-xs text-gray-500">
                +{doc.topics.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 学习计划卡片组件
const StudyPlanCard = ({ 
  plan, 
  selectedDocIds, 
  onSelect 
}: { 
  plan: typeof studyPlans[0];
  selectedDocIds: Set<string>;
  onSelect: (planId: string) => void;
}) => {
  const isRecommended = plan.recommendedDocs.length > 0;
  const matchCount = plan.recommendedDocs.filter(id => selectedDocIds.has(id)).length;
  
  return (
    <div 
      className="card cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={() => onSelect(plan.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {plan.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {plan.description}
          </p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>时长: {plan.duration}</span>
            {isRecommended && (
              <span>
                推荐: {plan.recommendedDocs.length} 个文档
              </span>
            )}
          </div>
        </div>
        {isRecommended && (
          <div className="text-right">
            <div className="text-sm font-medium text-green-600">
              {matchCount}/{plan.recommendedDocs.length}
            </div>
            <div className="text-xs text-gray-500">匹配度</div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="text-xs text-gray-500">学习内容:</div>
        <div className="flex flex-wrap gap-2">
          {plan.components.map((component) => (
            <span 
              key={component}
              className="px-2 py-1 bg-blue-50 text-xs text-blue-700 rounded"
            >
              {component}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function StudyPage() {
  // 使用状态管理选择的文档和文件夹展开状态
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1'])); // 默认展开机器学习文件夹
  
  // 切换文档选择状态
  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocIds(newSelected);
  };

  // 切换文件夹展开状态
  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // 选择学习计划
  const selectStudyPlan = (planId: string) => {
    const plan = studyPlans.find(p => p.id === planId);
    if (plan && plan.recommendedDocs.length > 0) {
      setSelectedDocIds(new Set(plan.recommendedDocs));
    }
  };

  // 全选/清除
  const selectAll = () => setSelectedDocIds(new Set(initialDocuments.map(doc => doc.id)));
  const clearAll = () => setSelectedDocIds(new Set());

  // 计算统计信息
  const selectedDocs = initialDocuments.filter(doc => selectedDocIds.has(doc.id));
  const totalSegments = selectedDocs.reduce((sum, doc) => sum + doc.segments, 0);
  const totalPages = selectedDocs.reduce((sum, doc) => sum + doc.pages, 0);

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* 极简页面标题 */}
        <div className="mb-12">
          <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
            STUDY PREPARATION
          </div>
          <h1 className="text-3xl font-light text-black mb-4">学习准备</h1>
          <p className="text-gray-600 text-lg">
            选择多个文档，生成统一的学习内容和模拟考试
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* 文档选择区域 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 选择状态栏 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border rounded">
              <div className="flex items-center space-x-6">
                <span className="text-sm text-gray-700">
                  已选择 {selectedDocs.length} 个文档
                </span>
                <span className="text-sm text-gray-600">
                  {totalSegments} 个片段 · {totalPages} 页
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  className="text-sm text-gray-600 hover:text-gray-900"
                  onClick={selectAll}
                >
                  全选
                </button>
                <button 
                  className="text-sm text-gray-600 hover:text-gray-900"
                  onClick={clearAll}
                >
                  清除
                </button>
                <button className="btn-primary text-sm px-4 py-2">
                  开始学习准备
                </button>
              </div>
            </div>

            {/* 快速学习计划 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">快速学习计划</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {studyPlans.map((plan) => (
                  <StudyPlanCard 
                    key={plan.id}
                    plan={plan}
                    selectedDocIds={selectedDocIds}
                    onSelect={selectStudyPlan}
                  />
                ))}
              </div>
            </div>

            {/* 按文件夹组织的文档列表 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  课程文档 ({initialDocuments.length})
                </h3>
                <div className="flex items-center space-x-4">
                  <select className="text-sm border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-green-500">
                    <option>全部类型</option>
                    <option>PDF</option>
                    <option>PPTX</option>
                    <option>TXT</option>
                  </select>
                  <select className="text-sm border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-green-500">
                    <option>按时间排序</option>
                    <option>按页数排序</option>
                    <option>按片段排序</option>
                  </select>
                </div>
              </div>

              {/* 按文件夹组织文档，支持跨文件夹选择 */}
              <div className="space-y-4">
                {mockFolders.map((folder) => (
                  <FolderGroup 
                    key={folder.id}
                    folder={folder}
                    documents={initialDocuments}
                    selectedDocIds={selectedDocIds}
                    onToggleDoc={toggleDocument}
                    expanded={expandedFolders.has(folder.id)}
                    onToggleExpand={toggleFolderExpansion}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 侧边配置面板 */}
          <div className="space-y-6">
            {/* 学习内容配置 */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                生成内容
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    统一总结
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    中英对照
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    关键术语表
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    概念地图
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    综合考试
                  </span>
                </label>
              </div>
            </div>

            {/* 考试配置 */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                考试设置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    考试时长
                  </label>
                  <select className="w-full text-sm border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-green-500">
                    <option>30分钟</option>
                    <option>45分钟</option>
                    <option>60分钟</option>
                    <option>90分钟</option>
                    <option>120分钟</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    题目数量
                  </label>
                  <select className="w-full text-sm border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-green-500">
                    <option>20题</option>
                    <option>30题</option>
                    <option>40题</option>
                    <option>50题</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    难度分布
                  </label>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>简单 (40%)</span>
                      <span>12题</span>
                    </div>
                    <div className="flex justify-between">
                      <span>中等 (40%)</span>
                      <span>12题</span>
                    </div>
                    <div className="flex justify-between">
                      <span>困难 (20%)</span>
                      <span>6题</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 当前选择统计 */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                选择统计
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">文档数量</span>
                  <span className="text-sm font-medium">{selectedDocs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">总页数</span>
                  <span className="text-sm font-medium">{totalPages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">片段数</span>
                  <span className="text-sm font-medium">{totalSegments}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">预计处理时间</span>
                    <span className="text-sm font-medium">5-8分钟</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 开始学习按钮 */}
            <button className="w-full btn-primary py-3">
              开始学习准备
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}