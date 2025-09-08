/**
 * 会话感知的导航组件
 * 根据用户登录状态显示不同的导航选项
 */

'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function Navigation() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
        <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center space-x-6">
        {/* 已登录用户的导航 */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/dashboard" className="text-gray-900 hover:text-green-500 transition-colors text-sm font-medium">
            Dashboard
          </Link>
          <Link href="/upload" className="text-gray-900 hover:text-green-500 transition-colors text-sm font-medium">
            Upload
          </Link>
          <Link href="/library" className="text-gray-900 hover:text-green-500 transition-colors text-sm font-medium">
            Library
          </Link>
          <Link href="/study" className="text-gray-900 hover:text-green-500 transition-colors text-sm font-medium">
            Study
          </Link>
          <Link href="/review" className="text-gray-900 hover:text-green-500 transition-colors text-sm font-medium">
            Review
          </Link>
        </nav>
        
        {/* 用户菜单 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {session.user.image && (
              <img 
                src={session.user.image} 
                alt={session.user.name || session.user.email}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm font-medium text-gray-900">
              {session.user.name || session.user.email}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* 未登录用户的导航 */}
      <Link href="/login" className="text-gray-900 hover:text-green-500 transition-colors text-sm font-medium">
        Login
      </Link>
      <Link href="/register" className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
        Sign Up
      </Link>
    </div>
  );
}