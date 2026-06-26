'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { getUrlAnalytics } from '@/lib/api/urls';
import StatsCard from '@/components/StatsCard';
import Modal from '@/components/Modal';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { UrlAnalytics } from '@/lib/types';
import { BarChart3, Users, Activity, QrCode } from 'lucide-react';

export default function AnalyticsPage() {
  const { shortCode } = useParams() as { shortCode: string };
  const router = useRouter();
  const { addToast } = useToast();
  const [data, setData] = useState<UrlAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUrlAnalytics(shortCode);
      if (response.success) {
        setData(response.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics data';
      addToast('error', message);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [shortCode, router, addToast]);

  useEffect(() => {
    if (shortCode) {
      fetchAnalytics();
    }
  }, [shortCode, fetchAnalytics]);

  if (loading) {
    return (
      <div className="analytics-page container py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-12 text-center" id="analytics-error">
        <h4>No analytics details available</h4>
        <Link href="/dashboard" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { metrics, originalUrl, createdAt, expiresAt, isActive } = data;

  // Render variables
  const maxClicks = Math.max(...metrics.timeline.map((t) => t.clicks), 1);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    `${typeof window !== 'undefined' ? window.location.origin : ''}/${shortCode}`
  )}`;

  return (
    <div className="analytics-page" id="analytics-page-root">
      {/* Page Header */}
      <div className="analytics-page__header">
        <div className="analytics-page__header-nav">
          <Link href="/dashboard" className="analytics-page__back-link">
            &larr; Back to Dashboard
          </Link>
        </div>
        <div className="analytics-page__header-content mt-4">
          <div>
            <span className="analytics-page__subtitle">URL Performance Analytics</span>
            <h2 className="analytics-page__title">/{shortCode}</h2>
            <p className="analytics-page__original-url" title={originalUrl}>
              Destination: <a href={originalUrl} target="_blank" rel="noopener noreferrer">{originalUrl}</a>
            </p>
          </div>
          <div className="analytics-page__actions">
            {(!expiresAt || new Date(expiresAt) > new Date()) && isActive && (
              <button
                onClick={() => setQrOpen(true)}
                className="btn btn-secondary"
                id="btn-qr-generate"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <QrCode size={16} /> Generate QR Code
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meta stats */}
      <section className="analytics-page__meta-grid mt-6">
        <StatsCard
          label="Total Click Events"
          value={metrics.totalClicks}
          icon={<BarChart3 size={20} style={{ color: 'var(--primary)' }} />}
        />
        <StatsCard
          label="Unique Visitors"
          value={metrics.uniqueVisitors}
          icon={<Users size={20} style={{ color: 'var(--primary)' }} />}
        />
        <StatsCard
          label="Status"
          value={isActive ? 'Active' : 'Inactive'}
          icon={<Activity size={20} style={{ color: 'var(--primary)' }} />}
        />
      </section>

      {/* Timeline Click History (Pure CSS Chart) */}
      <section className="analytics-section mt-8">
        <h3 className="analytics-section__title">Click Timeline (Last 24 Hours)</h3>
        {metrics.timeline.length === 0 ? (
          <div className="analytics-section__empty">No click events registered yet.</div>
        ) : (
          <div className="css-chart-container mt-6">
            <div className="css-chart">
              {metrics.timeline.map((point, index) => {
                const heightPercent = (point.clicks / maxClicks) * 100;
                // Parse date/time bucket format from backend (e.g. 2026-06-14 18:00:00)
                const hourLabel = new Date(point.hour).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });

                return (
                  <div key={index} className="css-chart__bar-wrapper">
                    <div className="css-chart__bar-tooltip">
                      {point.clicks} clicks at {hourLabel}
                    </div>
                    <div
                      className="css-chart__bar"
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />
                    <div className="css-chart__bar-label">{hourLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Breakdowns Grid */}
      <div className="analytics-page__breakdowns mt-8">
        {/* Referrers */}
        <section className="analytics-section">
          <h3 className="analytics-section__title">Top Referrers</h3>
          {metrics.referrers.length === 0 ? (
            <div className="analytics-section__empty">No referrer sources recorded.</div>
          ) : (
            <div className="breakdown-list mt-4">
              {metrics.referrers.map((item, idx) => {
                const percentage = metrics.totalClicks > 0 ? (item.clicks / metrics.totalClicks) * 100 : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-item__meta">
                      <span className="breakdown-item__name">{item.referrer}</span>
                      <span className="breakdown-item__value">{item.clicks} clicks</span>
                    </div>
                    <div className="breakdown-item__progress-bg">
                      <div
                        className="breakdown-item__progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Browsers */}
        <section className="analytics-section">
          <h3 className="analytics-section__title">Browsers</h3>
          {metrics.browsers.length === 0 ? (
            <div className="analytics-section__empty">No browser data.</div>
          ) : (
            <div className="breakdown-list mt-4">
              {metrics.browsers.map((item, idx) => {
                const percentage = metrics.totalClicks > 0 ? (item.count / metrics.totalClicks) * 100 : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-item__meta">
                      <span className="breakdown-item__name">{item.browser}</span>
                      <span className="breakdown-item__value">{item.count} clicks</span>
                    </div>
                    <div className="breakdown-item__progress-bg">
                      <div
                        className="breakdown-item__progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Operating Systems */}
        <section className="analytics-section">
          <h3 className="analytics-section__title">Operating Systems</h3>
          {metrics.os.length === 0 ? (
            <div className="analytics-section__empty">No OS data.</div>
          ) : (
            <div className="breakdown-list mt-4">
              {metrics.os.map((item, idx) => {
                const percentage = metrics.totalClicks > 0 ? (item.count / metrics.totalClicks) * 100 : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-item__meta">
                      <span className="breakdown-item__name">{item.os}</span>
                      <span className="breakdown-item__value">{item.count} clicks</span>
                    </div>
                    <div className="breakdown-item__progress-bg">
                      <div
                        className="breakdown-item__progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Devices */}
        <section className="analytics-section">
          <h3 className="analytics-section__title">Devices</h3>
          {metrics.devices.length === 0 ? (
            <div className="analytics-section__empty">No device data.</div>
          ) : (
            <div className="breakdown-list mt-4">
              {metrics.devices.map((item, idx) => {
                const percentage = metrics.totalClicks > 0 ? (item.count / metrics.totalClicks) * 100 : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-item__meta">
                      <span className="breakdown-item__name">{item.device}</span>
                      <span className="breakdown-item__value">{item.count} clicks</span>
                    </div>
                    <div className="breakdown-item__progress-bg">
                      <div
                        className="breakdown-item__progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* QR Code Modal */}
      <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title="Quick Response (QR) Code">
        <div className="qr-modal-content" id="qr-modal-content">
          <img src={qrCodeUrl} alt={`QR Code for ${shortCode}`} />
          <p>Scan this QR code with any smartphone camera to navigate directly to your shortened URL.</p>
          <a
            href={qrCodeUrl}
            download={`qrcode-${shortCode}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            id="qr-download-btn"
          >
            Download QR Image
          </a>
        </div>
      </Modal>
    </div>
  );
}
