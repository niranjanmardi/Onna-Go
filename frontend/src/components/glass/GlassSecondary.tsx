import React from 'react';

export interface GlassSecondaryProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassSecondary: React.FC<GlassSecondaryProps> = ({
  children,
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-7',
  }[padding];

  return (
    <div
      className={`glass-card ${paddingClass} transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

