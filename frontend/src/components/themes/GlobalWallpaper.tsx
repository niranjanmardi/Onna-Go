import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export const GlobalWallpaper: React.FC = () => {
  const { activeTheme, overlayOpacity, blurLevel } = useTheme();

  if (!activeTheme?.full_url) {
    return null;
  }

  // Calculate subtle veil opacity: Never drown out the painterly vibrant colors
  const veilOpacity = Math.min(Math.max((overlayOpacity - 0.5) * 0.4, 0), 0.25);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* High-Resolution Master Impressionist Oil Artwork */}
      <img
        src={activeTheme.full_url}
        alt=""
        className="w-full h-full object-cover object-center transform-gpu will-change-transform"
        style={{
          filter: blurLevel > 0 ? `blur(${blurLevel}px)` : undefined,
          transform: blurLevel > 0 ? 'scale(1.04)' : undefined,
        }}
      />

      {/* Ultra-subtle Apple-style depth gradient (preserves vivid oil painting colors) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none transition-opacity duration-300"
        style={{ opacity: veilOpacity }}
      />
    </div>
  );
};
