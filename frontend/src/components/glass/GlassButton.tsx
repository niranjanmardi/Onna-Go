import React from 'react';
import { Loader2 } from 'lucide-react';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5',
    md: 'h-11 px-4 sm:px-5 text-sm font-semibold rounded-xl gap-2',
    lg: 'h-13 px-6 text-base font-bold rounded-2xl gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] hover:brightness-105 active:scale-[0.98] shadow-md border border-white/20',
    secondary:
      'glass-interactive text-white hover:bg-white/25 active:scale-[0.98] border border-white/30',
    danger:
      'bg-red-500/25 text-red-100 hover:bg-red-500/35 active:scale-[0.98] border border-red-500/40 backdrop-blur-md',
    ghost:
      'text-white/80 hover:text-white hover:bg-white/15 active:scale-[0.98] border-transparent',
    glass:
      'glass-panel text-white hover:bg-white/30 active:scale-[0.98] border border-white/40 shadow-lg',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer ${
        fullWidth ? 'w-full' : ''
      } ${
        disabled || loading
          ? 'opacity-50 cursor-not-allowed pointer-events-none'
          : ''
      } ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

