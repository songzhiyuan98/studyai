/**
 * 仪表板页面
 * 显示系统概览和快速操作入口
 */

import type { Metadata } from 'next';

// 页面元数据
export const metadata: Metadata = {
  title: '仪表板',
  description: 'Study Assistant 主仪表板 - 查看统计信息和快速操作',
};

// 模拟统计数据
const stats = {
  totalLectures: 12,
  totalSegments: 1247,
  generatedItems: 89,
  completedExams: 23,
};

// 最近活动数据
const recentActivities = [
  {
    id: 1,
    type: 'upload',
    title: '上传了新文档',
    description: '人工智能基础 - 第一章',
    timestamp: '2小时前',
    icon: '📄',
  },
  {
    id: 2,
    type: 'generate',
    title: '生成了学习内容',
    description: '翻译 + 摘要 + 术语表',
    timestamp: '5小时前',
    icon: '🤖',
  },
  {
    id: 3,
    type: 'exam',
    title: '完成了模拟考试',
    description: '机器学习基础测试',
    timestamp: '1天前',
    icon: '📝',
  },
];

// 快速操作按钮
const QuickActionButton = ({ 
  title, 
  description, 
  icon, 
  href, 
  color = 'blue' 
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100', 
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  };

  return (
    <a
      href={href}
      className={`block p-6 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors ${colorClasses[color]}`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm opacity-75">{description}</p>
    </a>
  );
};

// 统计卡片组件
const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue' 
}: { 
  title: string; 
  value: number; 
  icon: string; 
  color?: 'blue' | 'green' | 'purple' | 'orange' 
}) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600', 
    orange: 'text-orange-600',
  };

  return (
    <div className="card">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`text-2xl ${colorClasses[color]}`}>{icon}</div>
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

// 仪表板页面组件
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* 极简页面标题 */}
        <div className="mb-12">
          <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
            DASHBOARD
          </div>
          <h1 className="text-3xl font-light text-black mb-4">学习控制中心</h1>
          <p className="text-gray-600 text-lg">
            管理你的文档，查看学习进度，生成个性化内容
          </p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="讲义文档"
            value={stats.totalLectures}
            icon="📚"
            color="blue"
          />
          <StatCard
            title="文档片段"
            value={stats.totalSegments}
            icon="📄"
            color="green"
          />
          <StatCard
            title="生成内容"
            value={stats.generatedItems}
            icon="🤖"
            color="purple"
          />
          <StatCard
            title="完成考试"
            value={stats.completedExams}
            icon="📝"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 快速操作 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">快速操作</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickActionButton
                title="上传文档"
                description="上传PDF、PPTX或文本文档"
                icon="📤"
                href="/upload"
                color="blue"
              />
              <QuickActionButton
                title="浏览文档库"
                description="查看所有已上传的文档"
                icon="📚"
                href="/library"
                color="green"
              />
              <QuickActionButton
                title="生成学习内容"
                description="创建翻译、摘要和术语表"
                icon="🎯"
                href="/generate"
                color="purple"
              />
              <QuickActionButton
                title="模拟考试"
                description="基于文档内容创建考试"
                icon="📝"
                href="/exam"
                color="orange"
              />
            </div>
          </div>

          {/* 最近活动 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">最近活动</h2>
            <div className="card">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="text-xl">{activity.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 查看更多按钮 */}
              <div className="mt-4 pt-4 border-t">
                <a
                  href="/activity"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  查看所有活动 →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="mt-8">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-700">数据库服务正常</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-700">AI服务可用</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-700">文件存储正常</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}