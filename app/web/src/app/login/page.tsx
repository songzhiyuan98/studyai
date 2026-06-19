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
        <p className="eyebrow">Sign in</p>
        <h1 className="mt-4 text-4xl font-normal leading-tight text-[#17171c] sm:text-5xl">
          Return to your source-backed study desk.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#616161]">
          Continue from saved lecture context, generated artifacts, and the exact sources behind your study notes.
        </p>
        <div className="mt-8 border-y border-[#d9d9dd] py-4">
          {['Library', 'Reader', 'Review'].map((item) => (
            <div key={item} className="flex items-center justify-between py-2 text-sm">
              <span className="text-[#616161]">{item}</span>
              <span className="text-[#93939f]">source-aware</span>
            </div>
          ))}
        </div>
      </section>

      <section className="auth-panel">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-normal text-[#75758a]">Workspace access</p>
          <h2 className="mt-2 text-2xl font-normal text-[#17171c]">Sign in to StudyFlow</h2>
        </div>

        {error ? (
          <div className="mb-4 border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">
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

        <p className="mt-6 text-center text-sm text-[#616161]">
          New to StudyFlow?{' '}
          <Link href="/register" className="text-link">
            Create a workspace
          </Link>
        </p>
      </section>
    </div>
  );
}
