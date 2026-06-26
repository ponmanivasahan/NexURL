'use client';

import { useState, useEffect, useCallback } from 'react';
import ShortenForm from '@/components/ShortenForm';
import UrlCard from '@/components/UrlCard';
import StatsCard from '@/components/StatsCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { getUserUrls, deleteUrl } from '@/lib/api/urls';
import { useToast } from '@/components/Toast';
import type { ShortUrl } from '@/lib/types';
import { Link2, TrendingUp, Activity, Inbox } from 'lucide-react';

export default function DashboardPage() {
  const { addToast } = useToast();
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch URLs
  const fetchUrls = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUserUrls(page, 10);
      if (response.success) {
        setUrls(response.data);
        setTotalPages(response.pagination.pages);
        setTotalItems(response.pagination.total);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load URLs';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  // Handle URL creation success
  const handleShortenSuccess = () => {
    fetchUrls(); // Refresh the URL list
  };

  // Handle URL deletion with optimistic UI updates
  const handleDeleteUrl = async (shortCode: string) => {
    // Save previous state for rollback
    const previousUrls = [...urls];
    
    // Optimistically remove from UI
    setUrls((prev) => prev.filter((item) => item.shortCode !== shortCode));
    setTotalItems((prev) => prev - 1);
    
    try {
      await deleteUrl(shortCode);
      addToast('success', 'URL deleted successfully');
    } catch (err: unknown) {
      // Rollback
      setUrls(previousUrls);
      setTotalItems((prev) => prev + 1);
      throw err; // Let UrlCard handle error state reset
    }
  };

  // Filter URLs locally based on debounced search query
  const filteredUrls = urls.filter((url) => {
    const query = debouncedQuery.toLowerCase();
    return (
      url.shortCode.toLowerCase().includes(query) ||
      url.originalUrl.toLowerCase().includes(query) ||
      (url.customAlias && url.customAlias.toLowerCase().includes(query))
    );
  });

  // Calculate statistics
  const totalLinks = totalItems;
  const activeLinks = urls.filter((url) => {
    const isExpired = url.expiresAt ? new Date(url.expiresAt) < new Date() : false;
    return url.isActive && !isExpired;
  }).length;

  return (
    <div className="dashboard" id="dashboard-page-container">
      {/* Overview Cards */}
      <section className="dashboard__overview">
        <StatsCard
          label="Total Links"
          value={totalLinks}
          icon={<Link2 size={20} style={{ color: 'var(--primary)' }} />}
        />
        <StatsCard
          label="Active Links"
          value={activeLinks}
          icon={<Activity size={20} style={{ color: 'var(--primary)' }} />}
        />
        <StatsCard
          label="Page"
          value={`${page} / ${totalPages}`}
          icon={<TrendingUp size={20} style={{ color: 'var(--primary)' }} />}
        />
      </section>

      {/* Main Grid */}
      <div className="dashboard__grid mt-8">
        {/* URL Creator */}
        <div className="dashboard__creator-panel">
          <ShortenForm onSuccess={handleShortenSuccess} />
        </div>

        {/* Links Explorer */}
        <div className="dashboard__list-panel">
          <div className="dashboard__list-header">
            <h3 className="dashboard__list-title">My Shortened Links</h3>
            <div className="dashboard__search-wrapper">
              <input
                type="text"
                placeholder="Search links..."
                className="input input-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="link-search-input"
                suppressHydrationWarning
              />
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filteredUrls.length === 0 ? (
            <div className="dashboard__empty-state" id="empty-urls-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
              <Inbox size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
              <h4>No links found</h4>
              <p>
                {debouncedQuery
                  ? "No URLs match your search query."
                  : "You haven't shortened any links yet. Use the form to start!"}
              </p>
            </div>
          ) : (
            <div className="dashboard__cards-list" id="urls-cards-list">
              {filteredUrls.map((url) => (
                <UrlCard
                  key={url.id}
                  url={url}
                  onDelete={handleDeleteUrl}
                />
              ))}
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="dashboard__pagination mt-6" id="pagination-controls">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                id="pagination-prev"
              >
                Previous
              </button>
              <span className="dashboard__pagination-info">
                Showing {totalItems === 0 ? 0 : (page - 1) * 10 + 1} - {Math.min(page * 10, totalItems)} of {totalItems} Links
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                id="pagination-next"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
