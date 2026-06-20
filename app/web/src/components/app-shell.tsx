'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/chat', label: 'Chat' },
  { href: '/library', label: 'Library' },
  { href: '/saved', label: 'Saved', aliases: ['/review'] },
];

type RecentChat = {
  id: string;
  title: string;
  time: string;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActiveNavItem(pathname: string, item: (typeof navItems)[number]) {
  return isActivePath(pathname, item.href) || item.aliases?.some((href) => isActivePath(pathname, href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isChat = isActivePath(pathname, '/chat');
  const [showRouteSkeleton, setShowRouteSkeleton] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);

  useEffect(() => {
    if (isChat) {
      setShowRouteSkeleton(false);
      return;
    }

    setShowRouteSkeleton(true);
    const timer = window.setTimeout(() => setShowRouteSkeleton(false), 220);
    return () => window.clearTimeout(timer);
  }, [isChat, pathname]);

  useEffect(() => {
    if (!session?.user) return;

    let cancelled = false;

    const loadRecentChats = async () => {
      try {
        const response = await fetch('/api/chat/sessions', {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();

        if (!cancelled && response.ok && payload.success) {
          setRecentChats(payload.data.sessions || []);
        }
      } catch (error) {
        if (!cancelled) {
          setRecentChats([]);
        }
      }
    };

    loadRecentChats();
    window.addEventListener('studyflow:chat-sessions-changed', loadRecentChats);

    return () => {
      cancelled = true;
      window.removeEventListener('studyflow:chat-sessions-changed', loadRecentChats);
    };
  }, [session?.user, pathname]);

  if (status === 'loading') {
    return (
      <div className="app-loading-shell">
        <div className="h-8 w-8 rounded-md border border-[#e5e5e5]" />
        <div className="h-4 w-28 rounded bg-[#fafafa]" />
      </div>
    );
  }

  if (!session?.user) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-top">
          <Link href="/chat" className="app-brand-lockup">
            <span className="app-brand-orb">
              <span className="app-brand-orb-core" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-medium leading-5 text-[#000000]">StudyFlow</span>
              <span className="block truncate text-xs leading-5 text-[#737373]">Library-grounded AI</span>
            </span>
          </Link>
          <Link href="/chat" className="app-new-chat">
            <span className="app-new-chat-plus">+</span>
            <span className="min-w-0 flex-1">New chat</span>
            <span className="font-mono text-[11px] text-[#a3a3a3]">⌘K</span>
          </Link>
        </div>

        <section className="app-recent-chats">
          <p className="rail-label px-2">Recent chats</p>
          <div className="mt-3 space-y-1">
            {recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat?sessionId=${chat.id}`}
                  className="app-recent-chat"
                >
                  <span className="truncate">{chat.title}</span>
                  <span className="shrink-0 text-xs text-[#a3a3a3]">{chat.time}</span>
                </Link>
              ))
            ) : (
              <p className="px-2 py-2 text-xs leading-5 text-[#a3a3a3]">
                Your recent study chats will appear here.
              </p>
            )}
          </div>
        </section>

        <div className="app-sidebar-bottom">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActiveNavItem(pathname, item) ? 'app-nav-link app-nav-link-active' : 'app-nav-link'}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-accountbar">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/chat" className="app-mobile-brand">
              <span className="app-brand-mark" />
              <span>StudyFlow</span>
            </Link>
          </div>

          <div className="account-menu">
            <button type="button" className="account-button">
              <span className="account-avatar">
                {(session.user.name || session.user.email || 'S').slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-36 truncate text-sm text-[#737373] sm:inline">
                {session.user.name || session.user.email}
              </span>
            </button>
            <div className="account-popover">
              <div className="border-b border-[#e5e5e5] px-3 py-2">
                <p className="truncate text-sm font-medium text-[#000000]">{session.user.name || 'StudyFlow user'}</p>
                <p className="truncate text-xs text-[#737373]">{session.user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="account-menu-item"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className={isChat ? 'app-main app-main-chat' : 'app-main'}>
          <div key={pathname} className={isChat ? 'app-page-transition app-page-transition-chat' : 'app-page-transition'}>
            {!isChat && showRouteSkeleton ? (
              <div className="route-skeleton" aria-hidden="true">
                <div className="route-skeleton-head">
                  <span className="skeleton-line skeleton-line-eyebrow" />
                  <span className="skeleton-line skeleton-line-title" />
                  <span className="skeleton-line skeleton-line-copy" />
                </div>
                <div className="route-skeleton-rule" />
                <div className="route-skeleton-grid">
                  <div className="route-skeleton-rail">
                    <span className="skeleton-line skeleton-line-sm" />
                    <span className="skeleton-line skeleton-line-md" />
                    <span className="skeleton-line skeleton-line-md" />
                    <span className="skeleton-line skeleton-line-sm" />
                  </div>
                  <div className="route-skeleton-board">
                    <span className="skeleton-line skeleton-line-wide" />
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                    <span className="skeleton-block skeleton-block-short" />
                  </div>
                </div>
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
