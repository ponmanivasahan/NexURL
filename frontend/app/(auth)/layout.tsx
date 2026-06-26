'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="auth-layout auth-layout--loading" id="auth-loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="auth-layout" id="auth-layout-root">
      <div className="auth-layout__background" />
      <div className="auth-layout__content">
        {children}
      </div>
    </div>
  );
}
