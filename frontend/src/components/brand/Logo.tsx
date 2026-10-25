import React from 'react';
import { useOptionalTheme } from '@/context/ThemeContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  theme,
}) => {
  const themeCtx = useOptionalTheme();
  let activeTheme = theme || themeCtx?.resolvedTheme;
  if (!activeTheme) {
    const isDarkDom = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    activeTheme = isDarkDom ? 'dark' : 'light';
  }
  const iconSizes = {
    sm: 'w-6 h-6 rounded-lg text-xs',
    md: 'w-8 h-8 rounded-xl text-sm',
    lg: 'w-10 h-10 rounded-xl text-base',
    xl: 'w-12 h-12 rounded-2xl text-lg',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const taglineSizes = {
    sm: 'text-[10px] leading-tight',
    md: 'text-[11px] leading-[1.35]',
    lg: 'text-xs leading-normal',
    xl: 'text-sm leading-normal',
  };

  const isDark = activeTheme === 'dark';

  return (
    <div
      className={`flex ${showTagline ? 'items-start' : 'items-center'} gap-2.5 select-none min-w-0 ${className}`}
    >
      {/* Apple-style minimalist icon emblem */}
      <div
        className={`flex-shrink-0 ${iconSizes[size]} flex items-center justify-center font-bold tracking-tighter ${
          isDark
            ? '!bg-white !text-[#171717] shadow-sm'
            : '!bg-[#171717] !text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
        } transition-transform duration-200 hover:scale-[1.02] ${showTagline ? 'mt-0.5' : ''}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4/6 h-4/6"
        >
          {/* Minimalist route loop symbol */}
          <circle cx="12" cy="12" r="8" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
          <path d="M16.24 16.24l2.83 2.83" />
        </svg>
      </div>

      {/* Typography Wordmark */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-['Plus_Jakarta_Sans'] ${textSizes[size]} font-bold tracking-tight whitespace-nowrap ${
              isDark ? '!text-white' : '!text-[#171717]'
            }`}
          >
            ONNA-GO
          </span>
        </div>

        {showTagline && (
          <span
            className={`${taglineSizes[size]} font-normal tracking-tight mt-1 ${
              isDark ? '!text-[#A1A1A1]' : '!text-[#737373]'
            } break-words`}
          >
            Ride Together. Vibe Together. Split Together.
          </span>
        )}
      </div>
    </div>
  );
};
