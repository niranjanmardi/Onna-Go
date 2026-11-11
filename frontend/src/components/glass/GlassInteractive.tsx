import React from 'react';

export interface GlassInteractiveProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export const GlassInteractive: React.FC<GlassInteractiveProps> = ({
  children,
  className = '',
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
  ...props
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as any);
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={ariaLabel}
      aria-pressed={active}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      className={`glass-interactive rounded-2xl p-4 sm:p-5 select-none transition-all duration-150 ${
        disabled
          ? 'opacity-50 cursor-not-allowed pointer-events-none'
          : 'cursor-pointer active:scale-[0.98]'
      } ${
        active
          ? 'ring-2 ring-[var(--theme-accent,#22C55E)] bg-white/25 shadow-lg'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

