import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  showTamil?: boolean;
  tamilClassName?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  showTamil = true,
  tamilClassName = '',
  className = '',
  theme = 'light',
}) => {
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
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Apple-style minimalist icon emblem */}
      <div
        className={`flex-shrink-0 ${iconSizes[size]} flex items-center justify-center font-bold tracking-tighter ${
          isDark
            ? 'bg-white text-[#171717] shadow-sm'
            : 'bg-[#171717] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
        } transition-transform duration-200 hover:scale-[1.02]`}
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
      <div className="flex flex-col justify-center whitespace-nowrap">
        <div className="flex items-center gap-1.5 leading-none whitespace-nowrap">
          <span
            className={`font-['Plus_Jakarta_Sans'] ${textSizes[size]} font-bold tracking-tight whitespace-nowrap ${
              isDark ? 'text-white' : 'text-[#171717]'
            }`}
          >
            ONNA-GO
          </span>

          {showTamil && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md tracking-normal font-sans whitespace-nowrap ${
                isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF]'
              } ${tamilClassName}`}
            >
              ஒண்ணா போ
            </span>
          )}
        </div>

        {showTagline && (
          <span
            className={`${taglineSizes[size]} font-normal tracking-tight mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-[#737373]'
            }`}
          >
            Ride Together. Vibe Together. Split Together.
          </span>
        )}
      </div>
    </div>
  );
};
