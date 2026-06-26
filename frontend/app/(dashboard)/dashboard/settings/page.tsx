'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/Toast';
import { User, Key } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [joinedDate, setJoinedDate] = useState('');

  const handleGenerateApiKey = () => {
    addToast('success', 'API key generated successfully!');
  };

  useEffect(() => {
    if (user?.createdAt) {
      setJoinedDate(
        new Date(user.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    }
  }, [user?.createdAt]);

  return (
    <div className="settings-page" id="settings-page-root">
      <div className="settings-page__header">
        <h2 className="settings-page__title">Account Settings</h2>
        <p className="settings-page__subtitle">Manage your profile, preferences, and developer API settings</p>
      </div>

      <div className="settings-page__grid mt-8">
        {/* Profile Card */}
        <section className="settings-section">
          <h3 className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'var(--primary)' }} />
            Profile Details
          </h3>
          <div className="settings-form mt-4">
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                className="input"
                value={user?.username || ''}
                readOnly
                disabled
                suppressHydrationWarning
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="text"
                className="input"
                value={user?.email || ''}
                readOnly
                disabled
                suppressHydrationWarning
              />
            </div>
            <div className="input-group">
              <label className="input-label">Joined Date</label>
              <input
                type="text"
                className="input"
                value={joinedDate}
                readOnly
                disabled
                suppressHydrationWarning
              />
            </div>
          </div>
        </section>

        {/* Developer / API Section */}
        <section className="settings-section">
          <h3 className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} style={{ color: 'var(--primary)' }} />
            Developer Access
          </h3>
          <p className="settings-section__description mt-2">
            NexURL provides a developer-friendly API for programmatically shortening URLs and tracking redirects.
          </p>
          
          <div className="settings-form mt-4">
            <div className="input-group">
              <label className="input-label">Developer API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input"
                  value="••••••••••••••••••••••••••••••••"
                  readOnly
                  disabled
                  suppressHydrationWarning
                />
                <button
                  onClick={handleGenerateApiKey}
                  className="btn btn-secondary"
                  id="btn-generate-api-key"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="settings-page__api-info mt-4">
              <h5>API Limits</h5>
              <div className="mt-2">
                <div className="settings-page__api-progress-label">
                  <span>Usage this window: 0 / 1,000 requests</span>
                  <span>0%</span>
                </div>
                <div className="settings-page__api-progress-bg">
                  <div className="settings-page__api-progress-fill" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
