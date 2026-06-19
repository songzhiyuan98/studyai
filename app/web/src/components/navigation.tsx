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
      <div className="flex items-center gap-3">
        <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-gray-100" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-5">
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/dashboard" className="nav-link">
            Workspace
          </Link>
          <Link href="/upload" className="nav-link">
            Upload
          </Link>
          <Link href="/library" className="nav-link">
            Library
          </Link>
          <Link href="/study" className="nav-link">
            Study
          </Link>
          <Link href="/review" className="nav-link">
            Review
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            {session.user.image && (
              <img
                src={session.user.image} 
                alt={session.user.name || session.user.email}
                className="h-7 w-7 rounded-full"
              />
            )}
            <span className="max-w-40 truncate text-sm text-gray-700">
              {session.user.name || session.user.email}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn-ghost"
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="btn-ghost">
        Login
      </Link>
      <Link href="/register" className="btn-primary">
        Sign Up
      </Link>
    </div>
  );
}
