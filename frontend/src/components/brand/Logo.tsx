import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  showTamil?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  showTamil = true,
  className = '',
  theme = 'light',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG Icon Mark */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]} transition-transform duration-300 hover:scale-105`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="onnaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
            <filter id="oglow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#4F46E5" floodOpacity="0.35" />
            </filter>
          </defs>
          <rect x="6" y="6" width="88" height="88" rx="24" fill="url(#onnaGrad)" filter="url(#oglow)" />
          {/* Road tracks */}
          <path d="M 24 74 C 36 52, 64 52, 76 74" stroke="rgba(255,255,255,0.22)" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 32 80 C 42 66, 58 66, 68 80" stroke="rgba(255,255,255,0.4)" strokeDasharray="3 4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Main Loop Circle */}
          <circle cx="48" cy="45" r="22" stroke="#FFFFFF" strokeWidth="7.5" fill="none" strokeLinecap="round" />
          <path d="M 48 23 C 60 23, 72 32, 72 45 C 72 58, 62 67, 50 67" stroke="#FFFFFF" strokeWidth="7.5" strokeLinecap="round" fill="none" />
          <circle cx="70" cy="40" r="4.5" fill="#FBBF24" />
          <circle cx="26" cy="50" r="3.5" fill="#38BDF8" />
        </svg>
      </div>

      {/* Typography Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <div className="flex items-center tracking-tight font-extrabold">
            <span className={`font-['Plus_Jakarta_Sans'] ${textSizes[size]} ${isDark ? 'text-white' : 'text-slate-900'} tracking-wider`}>
              ONNA
            </span>
            <span className={`font-['Plus_Jakarta_Sans'] ${textSizes[size]} text-indigo-400 mx-0.5`}>
              -
            </span>
            <span className={`font-['Plus_Jakarta_Sans'] ${textSizes[size]} bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent tracking-widest`}>
              GO
            </span>
          </div>

          {showTamil && (
            <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded ml-1 tracking-normal font-sans">
              ஒண்ணா போ
            </span>
          )}
        </div>

        {showTagline && (
          <span className={`${taglineSizes[size]} font-medium tracking-wide mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Ride Together. Vibe Together. Split Together.
          </span>
        )}
      </div>
    </div>
  );
};
