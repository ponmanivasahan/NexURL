'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { QrCode } from 'lucide-react';
import type { ShortUrl } from '@/lib/types';
import Modal from '@/components/Modal';

interface UrlCardProps {
  url: ShortUrl;
  onDelete: (shortCode: string) => Promise<void>;
}

export default function UrlCard({ url, onDelete }: UrlCardProps) {
  const { addToast } = useToast();
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url.shortUrl)}`;

  const handleCopy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url.shortUrl);
      addToast('success', 'Short link copied to clipboard!');
    } catch {
      addToast('error', 'Failed to copy short link');
    } finally {
      setTimeout(() => setCopying(false), 1000);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this URL? This action cannot be undone.')) {
      setDeleting(true);
      try {
        await onDelete(url.shortCode);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete URL';
        addToast('error', message);
        setDeleting(false);
      }
    }
  };

  const isExpired = url.expiresAt ? new Date(url.expiresAt) < new Date() : false;
  const formattedDate = new Date(url.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="url-card" id={`url-card-${url.shortCode}`}>
      <div className="url-card__header">
        <div className="url-card__title-row">
          <a
            href={url.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="url-card__short-url"
          >
            {url.shortCode}
          </a>
          <div className="url-card__badges">
            {url.isCustom && <span className="badge badge--custom">Custom</span>}
            {isExpired ? (
              <span className="badge badge--expired">Expired</span>
            ) : url.isActive ? (
              <span className="badge badge--active">Active</span>
            ) : (
              <span className="badge badge--inactive">Inactive</span>
            )}
          </div>
        </div>
        <div className="url-card__original-url" title={url.originalUrl}>
          {url.originalUrl}
        </div>
      </div>

      <div className="url-card__details">
        <div className="url-card__metric">
          <span className="url-card__metric-label">Created</span>
          <span className="url-card__metric-value">{formattedDate}</span>
        </div>
        {url.expiresAt && (
          <div className="url-card__metric">
            <span className="url-card__metric-label">Expires</span>
            <span className="url-card__metric-value">
              {new Date(url.expiresAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>

      <div className="url-card__footer">
        <div className="url-card__actions">
          <button
            onClick={handleCopy}
            className="btn btn-secondary btn-sm"
            disabled={copying}
            id={`btn-copy-${url.shortCode}`}
          >
            {copying ? 'Copied' : 'Copy'}
          </button>
          <Link
            href={`/dashboard/analytics/${url.shortCode}`}
            className="btn btn-ghost btn-sm"
            id={`btn-analytics-${url.shortCode}`}
          >
            Analytics
          </Link>
          {(!url.expiresAt || new Date(url.expiresAt) > new Date()) && url.isActive && (
            <button
              onClick={() => setQrOpen(true)}
              className="btn btn-secondary btn-sm"
              id={`btn-qr-${url.shortCode}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <QrCode size={14} /> QR
            </button>
          )}
          <button
            onClick={handleDelete}
            className="btn btn-danger btn-sm"
            disabled={deleting}
            id={`btn-delete-${url.shortCode}`}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title="Quick Response (QR) Code">
        <div className="qr-modal-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <img src={qrCodeUrl} alt={`QR Code for ${url.shortCode}`} style={{ maxWidth: '250px' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Scan this QR code with any smartphone camera to navigate directly to your shortened URL.
          </p>
          <a
            href={qrCodeUrl}
            download={`qrcode-${url.shortCode}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
          >
            Download QR Image
          </a>
        </div>
      </Modal>
    </div>
  );
}
