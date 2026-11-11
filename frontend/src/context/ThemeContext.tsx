import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncNativeStatusBarTheme } from '../lib/capacitor-init';
import { ThemeItem, DEFAULT_THEME, getThemeById, ThemeColorTokens, applyThemeTokens } from '../config/themes';
import { api } from '../lib/api-client';

export type Theme = 'light' | 'dark' | 'system';

export interface WallpaperPreferences {
  themeId: string;
  overlayOpacity: number;
  overlayStyle: 'dark' | 'light' | 'glass';
  blurLevel: number;
}

interface ThemeContextType {
  // Base light/dark theme
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;

  // Artistic Wallpaper theme
  activeThemeId: string;
  activeTheme: ThemeItem;
  tokens: ThemeColorTokens;
  overlayOpacity: number;
  overlayStyle: 'dark' | 'light' | 'glass';
  blurLevel: number;
  isSyncingWallpaper: boolean;
  setWallpaperTheme: (
    themeId: string,
    options?: {
      overlayOpacity?: number;
      overlayStyle?: 'dark' | 'light' | 'glass';
      blurLevel?: number;
    }
  ) => Promise<void>;
  resetWallpaperTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = 'onnago_theme';
export const WALLPAPER_STORAGE_KEY = 'onnago_wallpaper_theme';

const DEFAULT_WALLPAPER_PREFS: WallpaperPreferences = {
  themeId: DEFAULT_THEME.id,
  overlayOpacity: DEFAULT_THEME.default_opacity ?? 0.65,
  overlayStyle: DEFAULT_THEME.overlay_style ?? 'dark',
  blurLevel: 0,
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Light / Dark Mode State
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {}
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // 2. Artistic Wallpaper Theme State
  const [wallpaperPrefs, setWallpaperPrefs] = useState<WallpaperPreferences>(() => {
    try {
      const cached = localStorage.getItem(WALLPAPER_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const resolved = getThemeById(parsed.themeId || DEFAULT_THEME.id);
        return {
          themeId: resolved.id,
          overlayOpacity: typeof parsed.overlayOpacity === 'number' ? parsed.overlayOpacity : resolved.default_opacity,
          overlayStyle: parsed.overlayStyle || resolved.overlay_style || 'dark',
          blurLevel: typeof parsed.blurLevel === 'number' ? parsed.blurLevel : 0,
        };
      }
    } catch {}
    return DEFAULT_WALLPAPER_PREFS;
  });

  const [isSyncingWallpaper, setIsSyncingWallpaper] = useState(false);

  // Active theme object from catalog
  const activeTheme = getThemeById(wallpaperPrefs.themeId);

  // Synchronize adaptive theme color tokens whenever active wallpaper changes
  useEffect(() => {
    applyThemeTokens(activeTheme.tokens);
  }, [activeTheme]);

  // Synchronize base Light/Dark mode
  useEffect(() => {
    const applyTheme = () => {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effectiveTheme: 'light' | 'dark' = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
      setResolvedTheme(effectiveTheme);

      const root = document.documentElement;
      const body = document.body;
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
        if (body) {
          body.classList.add('dark');
          body.setAttribute('data-theme', 'dark');
          body.style.colorScheme = 'dark';
        }
      } else {
        root.classList.remove('dark');
        root.removeAttribute('data-theme');
        root.style.colorScheme = 'light';
        if (body) {
          body.classList.remove('dark');
          body.removeAttribute('data-theme');
          body.style.colorScheme = 'light';
        }
      }

      // Dynamically update mobile browser address bar / notch theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0A0A0A' : '#16834A');
      }

      // Synchronize native Android status bar if running inside native app
      syncNativeStatusBarTheme(effectiveTheme === 'dark');
    };

    applyTheme();

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (theme === 'system') {
          applyTheme();
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Synchronize wallpaper preference from backend when authenticated
  const fetchBackendTheme = useCallback(async () => {
    const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
    if (!token) return;

    try {
      setIsSyncingWallpaper(true);
      const res = await api.get<{
        theme_id: string;
        overlay_opacity: number;
        overlay_style: 'dark' | 'light' | 'glass';
        blur_level: number;
      }>('/themes/me');

      if (res && res.theme_id) {
        const resolved = getThemeById(res.theme_id);
        const remotePrefs: WallpaperPreferences = {
          themeId: resolved.id,
          overlayOpacity: res.overlay_opacity ?? resolved.default_opacity ?? 0.65,
          overlayStyle: (res.overlay_style as any) || resolved.overlay_style || 'dark',
          blurLevel: res.blur_level ?? 0,
        };
        setWallpaperPrefs(remotePrefs);
        try {
          localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(remotePrefs));
        } catch {}
      }
    } catch {
      // Offline or network error: gracefully preserve existing cached wallpaper
    } finally {
      setIsSyncingWallpaper(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendTheme();

    const handleAuthChange = () => {
      fetchBackendTheme();
    };

    window.addEventListener('onnago:auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('onnago:auth-changed', handleAuthChange);
    };
  }, [fetchBackendTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  const setWallpaperTheme = async (
    themeId: string,
    options?: {
      overlayOpacity?: number;
      overlayStyle?: 'dark' | 'light' | 'glass';
      blurLevel?: number;
    }
  ) => {
    const targetTheme = getThemeById(themeId);
    const newPrefs: WallpaperPreferences = {
      themeId,
      overlayOpacity: options?.overlayOpacity ?? targetTheme.default_opacity ?? wallpaperPrefs.overlayOpacity,
      overlayStyle: options?.overlayStyle ?? targetTheme.overlay_style ?? wallpaperPrefs.overlayStyle,
      blurLevel: options?.blurLevel ?? wallpaperPrefs.blurLevel,
    };

    // Optimistically update local state & storage immediately
    setWallpaperPrefs(newPrefs);
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(newPrefs));
    } catch {}

    // Persist to backend if authenticated
    const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
    if (token) {
      try {
        await api.put('/themes/me', {
          theme_id: newPrefs.themeId,
          overlay_opacity: newPrefs.overlayOpacity,
          overlay_style: newPrefs.overlayStyle,
          blur_level: newPrefs.blurLevel,
        });
      } catch (err) {
        console.warn('Failed to sync theme to backend (will retry when online):', err);
      }
    }
  };

  const resetWallpaperTheme = async () => {
    setWallpaperPrefs(DEFAULT_WALLPAPER_PREFS);
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(DEFAULT_WALLPAPER_PREFS));
    } catch {}

    const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
    if (token) {
      try {
        await api.post('/themes/reset');
      } catch (err) {
        console.warn('Failed to reset theme on backend:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        activeThemeId: wallpaperPrefs.themeId,
        activeTheme,
        tokens: activeTheme.tokens,
        overlayOpacity: wallpaperPrefs.overlayOpacity,
        overlayStyle: wallpaperPrefs.overlayStyle,
        blurLevel: wallpaperPrefs.blurLevel,
        isSyncingWallpaper,
        setWallpaperTheme,
        resetWallpaperTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useOptionalTheme = () => {
  return useContext(ThemeContext);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
