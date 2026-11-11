import React from 'react';

export interface GlassSolidProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  label?: string;
  amount?: string | number;
  subtitle?: string;
  badge?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export const GlassSolid: React.FC<GlassSolidProps> = ({
  children,
  label,
  amount,
  subtitle,
  badge,
  trend = 'neutral',
  className = '',
  ...props
}) => {
  const trendColor = {
    positive: 'text-emerald-300 drop-shadow-sm',
    negative: 'text-rose-300 drop-shadow-sm',
    neutral: 'text-white drop-shadow-sm',
  }[trend];

  return (
    <div
      className={`glass-solid p-5 sm:p-6 transition-all ${className}`}
      {...props}
    >
      {(label || badge) && (
        <div className="flex items-center justify-between gap-3 mb-2">
          {label && (
            <span className="text-xs sm:text-sm font-semibold tracking-wide uppercase text-white/80">
              {label}
            </span>
          )}
          {badge}
        </div>
      )}

      {amount !== undefined && (
        <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums ${trendColor}`}>
          {amount}
        </div>
      )}

      {subtitle && (
        <p className="text-xs sm:text-sm text-white/70 mt-1">{subtitle}</p>
      )}

      {children}
    </div>
  );
};

