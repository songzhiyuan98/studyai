/**
 * 会话感知的导航组件
 * 根据用户登录状态显示不同的导航选项
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Workspace' },
    { href: '/library', label: 'Library' },
    { href: '/study', label: 'Study' },
    { href: '/review', label: 'Review' },
  ];

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
      <div className="flex min-w-0 items-center gap-4">
        <div className="hidden min-w-0 items-center gap-4 md:flex">
          <nav className="flex min-w-0 items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={active ? 'top-nav-link top-nav-link-active' : 'top-nav-link'}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 border-l border-[#d9d9dd] pl-3">
            <div className="hidden items-center gap-2 lg:flex">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || session.user.email}
                  className="h-7 w-7 rounded-full"
                />
              )}
              <span className="max-w-36 truncate text-sm text-[#616161]">
                {session.user.name || session.user.email}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="top-nav-link"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex max-w-[54vw] items-center gap-1 overflow-x-auto md:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? 'mobile-nav-link mobile-nav-link-active' : 'mobile-nav-link'}>
                {item.label}
              </Link>
            );
          })}
          <button onClick={() => signOut({ callbackUrl: '/' })} className="top-nav-link">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="top-nav-link">
        Login
      </Link>
      <Link href="/register" className="btn-primary">
        Sign Up
      </Link>
    </div>
  );
}
