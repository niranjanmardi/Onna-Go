import React from 'react';

export interface GlassPrimaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const GlassPrimary: React.FC<GlassPrimaryProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  ...props
}) => {
  return (
    <section
      className={`glass-panel p-5 sm:p-7 md:p-8 transition-all ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-5 pb-3 border-b border-white/15">
          <div>
            {typeof title === 'string' ? (
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {title}
              </h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/75 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};
