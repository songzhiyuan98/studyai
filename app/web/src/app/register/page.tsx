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
        <Link href="/" className="auth-brand" aria-label="StudyFlow home">
          <span className="landing-brand-mark">
            <span />
          </span>
          <span>StudyFlow</span>
        </Link>
        <p className="eyebrow mt-10">New workspace</p>
        <h1 className="auth-title">
          Build a study workspace around your own course files.
        </h1>
        <p className="auth-subtitle">
          Start with a library, then let Chat organize context from your lectures, notes, and saved source scopes.
        </p>

        <div className="auth-preview">
          <div className="auth-preview-bar">
            <span>Workspace setup</span>
            <span className="status-pill">3 minute start</span>
          </div>
          <div className="auth-preview-body">
            {['Create a course folder', 'Upload PDFs or notes', 'Ask Chat what to study next'].map((item, index) => (
              <div key={item} className="auth-setup-row">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{item}</p>
              </div>
            ))}
            <div className="auth-source-strip">
              <span>Library</span>
              <span>Chat</span>
              <span>Saved outputs</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">Account</p>
          <h2>Create your account</h2>
          <p>Your workspace will open directly into the AI study surface.</p>
        </div>

        {error ? (
          <div className="auth-error">
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

        <p className="mt-6 text-center text-sm text-[#737373]">
          Already have an account?{' '}
          <Link href="/login" className="text-link">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
