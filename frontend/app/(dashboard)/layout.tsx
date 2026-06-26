'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import { Link2, Menu } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="dashboard-layout" id="dashboard-layout-root">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="dashboard-layout__main">
          {/* Top header bar for mobile/desktop triggers */}
          <header className="dashboard-header">
            <button
              onClick={() => setSidebarOpen(true)}
              className="dashboard-header__toggle"
              aria-label="Open sidebar"
              id="mobile-sidebar-toggle"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu size={20} />
            </button>
            <div className="dashboard-header__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={18} style={{ color: 'var(--primary)' }} />
              NexURL Dashboard
            </div>
            <div className="dashboard-header__actions" />
          </header>

          <main className="dashboard-content">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
