import React, { useState, useEffect, useMemo } from 'react';
import { getAvatarUrl } from '@/lib/api-client';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  shape?: 'circle' | 'rounded-2xl' | 'rounded-xl';
  alt?: string;
}

const SIZE_MAP: Record<AvatarSize, { box: string; text: string }> = {
  xs: { box: 'w-6 h-6', text: 'text-[10px]' },
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-12 h-12', text: 'text-base' },
  xl: { box: 'w-16 h-16', text: 'text-xl' },
  '2xl': { box: 'w-20 h-20', text: 'text-2xl' },
};

// Deterministic vibrant gradient palettes for crisp initials
const GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-blue-500 to-indigo-700',
  'from-violet-500 to-purple-800',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-pink-700',
  'from-cyan-500 to-blue-700',
];

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getDeterministicGradient(seed?: string | null): string {
  if (!seed) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  shape = 'circle',
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state if avatarUrl changes
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const resolvedUrl = useMemo(() => {
    return avatarUrl ? getAvatarUrl(avatarUrl) : undefined;
  }, [avatarUrl]);

  const initials = useMemo(() => getInitials(name), [name]);
  const gradient = useMemo(() => getDeterministicGradient(name || initials), [name, initials]);

  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const shapeClass = shape === 'circle' ? 'rounded-full' : shape;

  const showImage = Boolean(resolvedUrl && !imageError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${shapeClass} ${sizeClasses.box} ${className} border border-white/30 dark:border-white/15 shadow-sm`}
      aria-label={alt || name || 'User avatar'}
    >
      {showImage ? (
        <img
          src={resolvedUrl}
          alt={alt || name || 'User avatar'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient} text-white font-bold tracking-tight ${sizeClasses.text} drop-shadow-xs`}
        >
          {initials}
        </div>
      )}
    </div>
  );
};

