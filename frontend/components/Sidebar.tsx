'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Link2, BarChart3, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/dashboard', icon: <BarChart3 size={18} />, label: 'Dashboard' },
  // { href: '/dashboard/settings', icon: <Settings size={18} />, label: 'Settings' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} id="sidebar">
        <Link href="/dashboard" className="sidebar__brand" onClick={onClose}>
          <Link2 className="navbar__brand-icon" size={20} style={{ color: 'var(--primary)' }} />
          NexURL
        </Link>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link ${isActive(item.href) ? 'sidebar__link--active' : ''}`}
              onClick={onClose}
              id={`sidebar-${item.label.toLowerCase()}`}
            >
              <span className="sidebar__link-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="sidebar__user-info">
              <div className="sidebar__username">{user?.username || 'User'}</div>
              <div className="sidebar__email">{user?.email || ''}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={logout}
            style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            id="sidebar-logout"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
