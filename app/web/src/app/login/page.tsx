'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sanitizeCallbackUrl } from '@/lib/callback-url';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError('Email or password is incorrect.');
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="auth-shell">
      <section className="auth-copy">
        <Link href="/" className="auth-brand" aria-label="StudyFlow home">
          <span className="landing-brand-mark">
            <span />
          </span>
          <span>StudyFlow</span>
        </Link>
        <p className="eyebrow mt-10">Welcome back</p>
        <h1 className="auth-title">
          Continue learning from the sources you already trust.
        </h1>
        <p className="auth-subtitle">
          Return to your library, saved source scopes, and Chat sessions without rebuilding context from scratch.
        </p>

        <div className="auth-preview">
          <div className="auth-preview-bar">
            <span>Today in StudyFlow</span>
            <span className="status-pill">sources ready</span>
          </div>
          <div className="auth-preview-body">
            <div className="auth-chat-line auth-chat-line-user">
              What should I review before quiz 2?
            </div>
            <div className="auth-chat-line">
              I found the strongest overlap in lambda calculus, Haskell functions, and pattern matching.
            </div>
            <div className="auth-source-strip">
              <span>lambda.pdf p7</span>
              <span>haskell.pdf p3</span>
              <span>saved quiz</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">Workspace access</p>
          <h2>Sign in</h2>
          <p>Use your StudyFlow account to reopen Chat and Library.</p>
        </div>

        {error ? (
          <div className="auth-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4" method="post">
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field"
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field"
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary h-11 w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl })}
          className="btn-secondary mt-3 h-11 w-full"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[#737373]">
          New to StudyFlow?{' '}
          <Link href="/register" className="text-link">
            Create a workspace
          </Link>
        </p>
      </section>
    </div>
  );
}
