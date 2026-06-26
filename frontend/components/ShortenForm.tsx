'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { createShortUrl } from '@/lib/api/urls';
import { validateUrl, validateCustomAlias } from '@/lib/validators';
import type { CreateUrlResult } from '@/lib/types';
import { Link2, QrCode } from 'lucide-react';
import Modal from '@/components/Modal';

interface ShortenFormProps {
  onSuccess?: (result: CreateUrlResult) => void;
}

export default function ShortenForm({ onSuccess }: ShortenFormProps) {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateUrlResult | null>(null);
  const [errors, setErrors] = useState<{ url?: string; alias?: string }>({});
  const [minDate, setMinDate] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 16));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const urlValidation = validateUrl(url);
    const aliasValidation = customAlias ? validateCustomAlias(customAlias) : { valid: true, errors: [] };

    if (!urlValidation.valid || !aliasValidation.valid) {
      setErrors({
        url: urlValidation.errors[0],
        alias: aliasValidation.errors[0],
      });
      return;
    }

    setErrors({});
    setLoading(true);
    setResult(null);

    try {
      const data = await createShortUrl({
        url,
        customAlias: customAlias || undefined,
        expiresAt: expiresAt || undefined,
      });
      setResult(data);
      addToast('success', 'URL shortened successfully!');
      onSuccess?.(data);
      setUrl('');
      setCustomAlias('');
      setExpiresAt('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to shorten URL';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', 'Copied to clipboard!');
    } catch {
      addToast('error', 'Failed to copy');
    }
  };

  return (
    <div className="shorten-form" id="shorten-form">
      <h3 className="shorten-form__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link2 size={18} style={{ color: 'var(--primary)' }} />
        Shorten a URL
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="shorten-form__row">
          <div className="input-group shorten-form__url-input">
            <input
              type="text"
              className={`input ${errors.url ? 'input-error' : ''}`}
              placeholder="Paste your long URL here..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors((p) => ({ ...p, url: undefined }));
              }}
              id="shorten-url-input"
              suppressHydrationWarning
            />
            {errors.url && <span className="input-error-text">{errors.url}</span>}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !url}
            id="shorten-submit"
          >
            {loading ? (
              <span className="spinner spinner-sm" />
            ) : (
              'Shorten'
            )}
          </button>
        </div>

        <div className="shorten-form__extras">
          <div className="input-group">
            <label className="input-label">Custom Alias (optional)</label>
            <input
              type="text"
              className={`input ${errors.alias ? 'input-error' : ''}`}
              placeholder="my-custom-link"
              value={customAlias}
              onChange={(e) => {
                setCustomAlias(e.target.value);
                if (errors.alias) setErrors((p) => ({ ...p, alias: undefined }));
              }}
              id="shorten-alias-input"
              suppressHydrationWarning
            />
            {errors.alias && <span className="input-error-text">{errors.alias}</span>}
          </div>
          <div className="input-group">
            <label className="input-label">Expiration (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={minDate}
              id="shorten-expiry-input"
              suppressHydrationWarning
            />
          </div>
        </div>
      </form>

      {result && (
        <div className="shorten-result" id="shorten-result" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="shorten-result__url" style={{ flexGrow: 1 }}>{result.shortUrl}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setQrOpen(true)}
            id="shorten-qr"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <QrCode size={14} /> QR
          </button>
          <button
            className="shorten-result__copy"
            onClick={() => copyToClipboard(result.shortUrl)}
            id="shorten-copy"
          >
            Copy
          </button>
        </div>
      )}

      {/* QR Code Modal for Shortened Result */}
      {result && (
        <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title="Quick Response (QR) Code">
          <div className="qr-modal-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(result.shortUrl)}`} 
              alt="QR Code" 
              style={{ maxWidth: '250px' }} 
            />
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Scan this QR code with any smartphone camera to navigate directly to your shortened URL.
            </p>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(result.shortUrl)}`}
              download="qrcode.png"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ marginTop: '8px' }}
            >
              Download QR Image
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
