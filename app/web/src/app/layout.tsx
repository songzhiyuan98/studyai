/**
 * 根布局组件
 * 为整个应用提供全局样式和布局结构
 */

import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { AuthProvider } from '../providers/auth-provider';
import { AppShell } from '../components/app-shell';
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
      <body className={`${inter.className} h-full bg-white antialiased`}>
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
