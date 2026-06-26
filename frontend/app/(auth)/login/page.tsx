'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Link2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client side basic validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = 'Email or username is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await login({ email, password });
      addToast('success', 'Welcome back to NexURL!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" id="login-card">
      <div className="auth-card__header">
        <Link href="/" className="auth-card__logo">
          <Link2 size={24} style={{ color: 'var(--primary)' }} /> NexURL
        </Link>
        <h2 className="auth-card__title">Welcome back</h2>
        <p className="auth-card__subtitle">Enter your details to access your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-card__form">
        <div className="input-group">
          <label className="input-label" htmlFor="login-email">Email or Username</label>
          <input
            type="text"
            id="login-email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={loading}
            autoComplete="username"
            suppressHydrationWarning
          />
          {errors.email && <span className="input-error-text">{errors.email}</span>}
        </div>

        <div className="input-group">
          <div className="flex justify-between items-center mb-1">
            <label className="input-label mb-0" htmlFor="login-password">Password</label>
          </div>
          <input
            type="password"
            id="login-password"
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            disabled={loading}
            autoComplete="current-password"
            suppressHydrationWarning
          />
          {errors.password && <span className="input-error-text">{errors.password}</span>}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block mt-6"
          disabled={loading}
          id="login-submit-btn"
        >
          {loading ? <span className="spinner spinner-sm" /> : 'Sign In'}
        </button>
      </form>


    </div>
  );
}
