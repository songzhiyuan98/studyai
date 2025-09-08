/**
 * 首页 - 科技极简风格
 * AI学习助手的主入口页面
 */

import type { Metadata } from 'next';

// 页面元数据
export const metadata: Metadata = {
  title: 'Study Assistant - AI学习助手',
  description: '基于AI的智能学习平台，将文档转化为个性化学习内容',
};

// 功能特点数据
const features = [
  {
    title: 'Document Processing',
    description: 'AI解析PDF、PPT等文档，提取核心内容',
    icon: '📄',
    metric: '99.5% 准确率'
  },
  {
    title: 'Smart Translation', 
    description: '技术专业术语的精准双语翻译',
    icon: '🔄',
    metric: '<2秒 响应'
  },
  {
    title: 'Content Generation',
    description: '自动生成摘要、术语表、复习卡片',
    icon: '⚡',
    metric: '10+种 格式'
  },
  {
    title: 'Mock Exams',
    description: '基于内容生成模拟考试和评估',
    icon: '📝',
    metric: '智能评分'
  }
];

// 使用流程数据
const workflow = [
  {
    step: '01',
    title: 'Upload',
    description: '上传学习文档'
  },
  {
    step: '02', 
    title: 'Process',
    description: 'AI智能解析'
  },
  {
    step: '03',
    title: 'Generate',
    description: '生成学习内容'
  },
  {
    step: '04',
    title: 'Study',
    description: '开始高效学习'
  }
];

// 统计数据
const stats = [
  { value: '10K+', label: '文档处理' },
  { value: '50K+', label: '内容生成' },
  { value: '99.5%', label: '准确率' },
  { value: '<2s', label: '响应时间' }
];

// 功能卡片组件
const FeatureCard = ({ feature }: { feature: typeof features[0] }) => (
  <div className="group">
    <div className="border border-gray-200 p-8 hover:border-green-500 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div className="text-2xl">{feature.icon}</div>
        <div className="text-xs font-mono text-gray-400 group-hover:text-green-500 transition-colors">
          {feature.metric}
        </div>
      </div>
      <h3 className="text-lg font-medium text-black mb-3">
        {feature.title}
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  </div>
);

// 工作流程组件
const WorkflowStep = ({ step, isLast }: { step: typeof workflow[0]; isLast: boolean }) => (
  <div className="flex items-start">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-sm font-mono">
        {step.step}
      </div>
      {!isLast && <div className="w-px h-16 bg-gray-200 mt-4"></div>}
    </div>
    <div className="ml-6 pb-16">
      <h4 className="text-lg font-medium text-black mb-2">{step.title}</h4>
      <p className="text-gray-600 text-sm">{step.description}</p>
    </div>
  </div>
);

// 统计数据组件
const StatItem = ({ stat }: { stat: typeof stats[0] }) => (
  <div className="text-center">
    <div className="text-2xl font-light text-black mb-1">{stat.value}</div>
    <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
  </div>
);

// 首页主组件
export default function HomePage() {
  return (
    <div className="bg-white">
      {/* 英雄区域 */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* 左侧内容 */}
          <div>
            <div className="text-xs font-mono text-gray-400 mb-6 tracking-wider">
              AI-POWERED LEARNING PLATFORM
            </div>
            <h1 className="text-5xl font-light text-black mb-6 leading-tight">
              Transform
              <br />
              Documents Into
              <br />
              <span className="text-green-500">Knowledge</span>
            </h1>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              使用AI技术将PDF文档、演示文稿转化为个性化的学习内容。
              生成翻译、摘要、测试题，让学习更高效。
            </p>
            
            {/* CTA按钮 */}
            <div className="flex items-center space-x-4">
              <button className="bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors">
                开始使用
              </button>
              <button className="text-gray-900 px-8 py-3 text-sm font-medium border border-gray-200 hover:border-gray-300 transition-colors">
                查看演示
              </button>
            </div>
          </div>
          
          {/* 右侧视觉 */}
          <div className="relative">
            <div className="aspect-square bg-gray-50 border border-gray-200">
              <div className="p-8 h-full flex flex-col justify-between">
                {/* 模拟文档处理界面 */}
                <div className="space-y-4">
                  <div className="h-2 bg-gray-200 w-full"></div>
                  <div className="h-2 bg-gray-200 w-4/5"></div>
                  <div className="h-2 bg-green-500 w-3/5"></div>
                  <div className="h-2 bg-gray-200 w-full"></div>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-black mx-auto mb-4 flex items-center justify-center">
                    <div className="text-white text-2xl">⚡</div>
                  </div>
                  <div className="text-xs font-mono text-gray-400">PROCESSING...</div>
                </div>
                
                <div className="space-y-4">
                  <div className="h-2 bg-gray-200 w-full"></div>
                  <div className="h-2 bg-gray-200 w-3/4"></div>
                  <div className="h-2 bg-gray-200 w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 统计数据区域 */}
      <section className="border-t border-b border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StatItem key={index} stat={stat} />
            ))}
          </div>
        </div>
      </section>

      {/* 功能特点区域 */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
            CORE FEATURES
          </div>
          <h2 className="text-3xl font-light text-black">
            一站式AI学习解决方案
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </section>

      {/* 工作流程区域 */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* 左侧内容 */}
            <div>
              <div className="text-xs font-mono text-gray-400 mb-4 tracking-wider">
                HOW IT WORKS
              </div>
              <h2 className="text-3xl font-light text-black mb-6">
                四步开启
                <br />
                智能学习
              </h2>
              <p className="text-gray-600 leading-relaxed">
                简单的上传流程，强大的AI处理能力，
                为你生成个性化的学习内容和评估工具。
              </p>
            </div>
            
            {/* 右侧流程 */}
            <div>
              {workflow.map((step, index) => (
                <WorkflowStep 
                  key={index} 
                  step={step} 
                  isLast={index === workflow.length - 1} 
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center border border-gray-200 p-16">
          <h2 className="text-3xl font-light text-black mb-4">
            开始你的智能学习之旅
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            立即上传你的学习材料，体验AI驱动的个性化学习
          </p>
          <button className="bg-green-500 text-white px-12 py-4 text-sm font-medium hover:bg-green-600 transition-colors">
            免费开始使用
          </button>
        </div>
      </section>
    </div>
  );
}