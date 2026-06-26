'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { Link2 } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-navbar">
      <Link href="/" className="navbar__brand">
        <Link2 className="navbar__brand-icon" size={20} style={{ color: 'var(--primary)' }} />
        NexURL
      </Link>

      <div className="navbar__links">
        <a href="#features" className="navbar__link">Features</a>
      </div>

      <div className="navbar__actions">
        {isAuthenticated ? (
          <Link href="/dashboard" className="btn btn-primary" id="nav-dashboard">
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="btn btn-primary" id="nav-login">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
