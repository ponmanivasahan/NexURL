'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ShortenForm from '@/components/ShortenForm';
import { useAuth } from '@/lib/context/AuthContext';
import { Link2, BarChart3, Key, Clock, Shield } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-page" id="landing-page-root">
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__background" />
        <div className="hero__container container">
          <div className="hero__content">
            <span className="hero__badge">
              <Link2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Lightning Fast redirects
            </span>
            <h1 className="hero__title">
              Shorten. Share. <span className="hero__title-gradient">Optimize.</span>
            </h1>
            <p className="hero__subtitle">
              NexURL is a modern link management platform designed for scale. Shorten long URLs, customize your links, and track performance with advanced, real-time analytics.
            </p>
            
            <div className="hero__form-wrapper">
              <ShortenForm />
            </div>

            {!isAuthenticated && (
              <div className="hero__cta">
                <span className="hero__cta-text">Want to track link analytics and set expiration dates?</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Link href="/login" className="btn btn-primary">
                    Login to NexURL &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="features__header">
            <h2 className="features__title">Engineered for Performance and Control</h2>
            <p className="features__subtitle">Everything you need to manage links at scale without compromising speed or security.</p>
          </div>

          <div className="features__grid">
            <div className="feature-card">
              <div className="feature-card__icon-wrapper mb-4" style={{ color: 'var(--primary)' }}>
                <BarChart3 size={32} />
              </div>
              <h3 className="feature-card__title">Real-time Analytics</h3>
              <p className="feature-card__text">
                Track click counts, referrer sources, browser types, and geographic locations instantly as they happen.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon-wrapper mb-4" style={{ color: 'var(--primary)' }}>
                <Key size={32} />
              </div>
              <h3 className="feature-card__title">Custom Aliases</h3>
              <p className="feature-card__text">
                Create branded, easy-to-remember aliases that increase click-through rates and reinforce trust.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon-wrapper mb-4" style={{ color: 'var(--primary)' }}>
                <Clock size={32} />
              </div>
              <h3 className="feature-card__title">Expiration Rules</h3>
              <p className="feature-card__text">
                Configure custom expiration dates and times for links to limit availability for temporary campaigns.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon-wrapper mb-4" style={{ color: 'var(--primary)' }}>
                <Shield size={32} />
              </div>
              <h3 className="feature-card__title">High Security</h3>
              <p className="feature-card__text">
                Built-in rate limiting, CSRF protection, input sanitization, and threat detection to secure your redirections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer__bottom">
            <p>&copy; {new Date().getFullYear()} NexURL. All rights reserved.</p>
            <div className="footer__links">
              <Link href="/login" className="footer__link">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
