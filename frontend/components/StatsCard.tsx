'use client';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatsCard({ label, value, icon, trend, className = '' }: StatsCardProps) {
  return (
    <div className={`stats-card ${className}`} id={`stats-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="stats-card__header">
        <span className="stats-card__label">{label}</span>
        <div className="stats-card__icon-wrapper">{icon}</div>
      </div>
      <div className="stats-card__body">
        <h4 className="stats-card__value">{value}</h4>
        {trend && (
          <div className={`stats-card__trend ${trend.isPositive ? 'stats-card__trend--up' : 'stats-card__trend--down'}`}>
            <span className="stats-card__trend-icon">{trend.isPositive ? '↑' : '↓'}</span>
            <span className="stats-card__trend-value">{Math.abs(trend.value)}%</span>
            <span className="stats-card__trend-label">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
