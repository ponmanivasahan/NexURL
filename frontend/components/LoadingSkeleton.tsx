'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  height?: string | number;
  width?: string | number;
}

export function Skeleton({ className = '', variant = 'rect', height, width }: SkeletonProps) {
  const style: React.CSSProperties = {
    height,
    width,
  };

  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={style}
    />
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="skeleton-container">
      <div className="skeleton-grid">
        <Skeleton height={120} className="mb-4" />
        <Skeleton height={120} className="mb-4" />
        <Skeleton height={120} className="mb-4" />
      </div>
      <div className="skeleton-list mt-8">
        <Skeleton height={80} className="mb-2" />
        <Skeleton height={80} className="mb-2" />
        <Skeleton height={80} className="mb-2" />
      </div>
    </div>
  );
}
