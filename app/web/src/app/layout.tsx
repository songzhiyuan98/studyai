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
    template: '%s | StudyFlow',
    default: 'StudyFlow',
  },
  description: 'Citation-first study workspace for student-owned lecture materials.',
  keywords: ['study workspace', 'RAG', 'lecture notes', 'citation', 'student tools'],
  authors: [{ name: 'StudyFlow Team' }],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'http://localhost:3000',
    siteName: 'StudyFlow',
    title: 'StudyFlow',
    description: 'Citation-first study workspace for student-owned lecture materials.',
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
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <AuthProvider>
          <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <Link href="/" className="flex items-center gap-3 rounded-md hover:opacity-80 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white">
                      <div className="h-3 w-3 rounded-sm bg-blue-600" />
                    </div>
                    <span className="text-base font-semibold text-gray-950">
                      StudyFlow
                    </span>
                  </Link>
                </div>
                <Navigation />
              </div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  &copy; 2026 StudyFlow
                </div>
                <div>
                  Student-owned course context, grounded in sources.
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
