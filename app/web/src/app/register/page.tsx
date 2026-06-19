'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-copy">
        <p className="eyebrow">Create workspace</p>
        <h1 className="mt-4 text-4xl font-normal leading-tight text-[#17171c] sm:text-5xl">
          Build a study system around your own materials.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#616161]">
          Start with a private workspace for lecture files, selected context, citations, and future RAG-powered study flows.
        </p>
        <div className="mt-8 grid gap-0 border-y border-[#d9d9dd]">
          {['Upload course files', 'Select chapters or lectures', 'Generate grounded study artifacts'].map((item, index) => (
            <div key={item} className={`py-3 text-sm text-[#616161] ${index > 0 ? 'border-t border-[#d9d9dd]' : ''}`}>
              {String(index + 1).padStart(2, '0')} · {item}
            </div>
          ))}
        </div>
      </section>

      <section className="auth-panel">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-normal text-[#75758a]">New workspace</p>
          <h2 className="mt-2 text-2xl font-normal text-[#17171c]">Create your account</h2>
        </div>

        {error ? (
          <div className="mb-4 border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4" method="post">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="form-label">First name</label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
                className="input-field"
                autoComplete="given-name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="form-label">Last name</label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
                className="input-field"
                autoComplete="family-name"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(event) => updateField('email', event.target.value)}
              className="input-field"
              autoComplete="email"
              disabled={loading}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(event) => updateField('password', event.target.value)}
              className="input-field"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              className="input-field"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary h-11 w-full">
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="btn-secondary mt-3 h-11 w-full"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[#616161]">
          Already have an account?{' '}
          <Link href="/login" className="text-link">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
