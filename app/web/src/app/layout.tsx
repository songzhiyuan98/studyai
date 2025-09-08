/**
 * 根布局组件
 * 为整个应用提供全局样式和布局结构
 */

import { Inter } from 'next/font/google';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthProvider } from '../providers/auth-provider';
import { Navigation } from '../components/navigation';
import './globals.css';

// 配置Inter字体
const inter = Inter({ subsets: ['latin'] });

// 页面元数据配置
export const metadata: Metadata = {
  title: {
    template: '%s | Study Assistant',
    default: 'Study Assistant - AI学习助手',
  },
  description: '基于AI的智能学习辅助平台，将教育材料转换为个性化学习内容和模拟考试',
  keywords: ['AI', '学习', '教育', 'PDF', '翻译', '总结', '考试'],
  authors: [{ name: 'Study Assistant Team' }],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'http://localhost:3000',
    siteName: 'Study Assistant',
    title: 'Study Assistant - AI学习助手',
    description: '基于AI的智能学习辅助平台',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// 根布局组件
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className={`${inter.className} h-full bg-white antialiased`}>
        <AuthProvider>
          {/* 极简导航头部 */}
          <header className="bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex justify-between items-center h-16">
                {/* 极简Logo - 点击返回主页 */}
                <div className="flex items-center">
                  <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-black flex items-center justify-center">
                      <div className="w-4 h-4 bg-white"></div>
                    </div>
                    <span className="text-xl font-light tracking-wide text-black">
                      Study Assistant
                    </span>
                  </Link>
                </div>
                
                {/* 会话感知导航 */}
                <Navigation />
              </div>
            </div>
          </header>
          
          {/* 主要内容区域 */}
          <main className="min-h-screen">
            {children}
          </main>
          
          {/* 极简脚部 */}
          <footer className="bg-white border-t border-gray-100">
            <div className="max-w-6xl mx-auto px-6 py-12">
              <div className="flex justify-between items-center">
                <div className="text-gray-600 text-sm">
                  &copy; 2025 Study Assistant
                </div>
                <div className="text-gray-400 text-sm">
                  AI-Powered Learning Platform
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}