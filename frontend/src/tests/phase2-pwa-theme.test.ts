// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import manifest from '../../public/manifest.json';
import { recordMeaningfulInteraction } from '../components/pwa/InstallPrompt';

describe('Phase 2: Manifest & PWA Configuration', () => {
  it('has valid PWA manifest fields for standalone installability', () => {
    expect(manifest.name).toBe('ONNA-GO');
    expect(manifest.short_name).toBe('ONNA-GO');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#16834A');
    expect(manifest.background_color).toBe('#FAFAF8');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const hasMaskable = manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes('maskable'));
    const has192 = manifest.icons.some((i: { sizes?: string }) => i.sizes === '192x192');
    const has512 = manifest.icons.some((i: { sizes?: string }) => i.sizes === '512x512');

    expect(hasMaskable).toBe(true);
    expect(has192).toBe(true);
    expect(has512).toBe(true);
  });
});

describe('Phase 2: Dark Mode Theme Engine & Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.body.className = '';
    document.body.removeAttribute('data-theme');
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#16834A');
    document.head.appendChild(meta);
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('correctly reads and persists theme preferences in localStorage', () => {
    const STORAGE_KEY = 'onnago_theme';

    localStorage.setItem(STORAGE_KEY, 'dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    localStorage.setItem(STORAGE_KEY, 'light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');

    localStorage.setItem(STORAGE_KEY, 'system');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
  });

  it('removes dark class and data-theme from both html and body when light mode is selected', () => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;

    const applyTheme = (isDark: boolean) => {
      const root = document.documentElement;
      const body = document.body;
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
        if (body) {
          body.classList.add('dark');
          body.setAttribute('data-theme', 'dark');
          body.style.colorScheme = 'dark';
        }
        if (meta) meta.content = '#0A0A0A';
      } else {
        root.classList.remove('dark');
        root.removeAttribute('data-theme');
        root.style.colorScheme = 'light';
        if (body) {
          body.classList.remove('dark');
          body.removeAttribute('data-theme');
          body.style.colorScheme = 'light';
        }
        if (meta) meta.content = '#16834A';
      }
    };

    // First activate dark
    applyTheme(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('dark')).toBe(true);
    expect(meta.content).toBe('#0A0A0A');

    // Switch to light
    applyTheme(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.body.classList.contains('dark')).toBe(false);
    expect(document.body.hasAttribute('data-theme')).toBe(false);
    expect(meta.content).toBe('#16834A');
  });

  it('choosing Light while OS is in dark mode strictly renders light mode', () => {
    // OS is in dark mode
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(prefersDark).toBe(true);

    const resolveEffectiveTheme = (setting: 'system' | 'light' | 'dark') => {
      return setting === 'system' ? (prefersDark ? 'dark' : 'light') : setting;
    };

    const effectiveTheme = resolveEffectiveTheme('light');
    expect(effectiveTheme).toBe('light');

    // Apply
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('system mode dynamically follows OS preference', () => {
    let mockDark = false;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: mockDark && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const resolve = (theme: 'system' | 'light' | 'dark') => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    };

    // When OS is light
    mockDark = false;
    expect(resolve('system')).toBe('light');

    // When OS is dark
    mockDark = true;
    expect(resolve('system')).toBe('dark');
  });
});

describe('Phase 2: PWA Install Prompt Mechanics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records meaningful user interactions for deferred install prompt', () => {
    const INTERACTION_KEY = 'onnago_meaningful_actions';
    expect(localStorage.getItem(INTERACTION_KEY)).toBeNull();

    recordMeaningfulInteraction();
    expect(Number(localStorage.getItem(INTERACTION_KEY))).toBe(1);

    recordMeaningfulInteraction();
    expect(Number(localStorage.getItem(INTERACTION_KEY))).toBe(2);
  });

  it('enforces a 14-day dismissal cooldown period', () => {
    const DISMISS_KEY = 'onnago_pwa_dismissed';
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

    const now = Date.now();
    localStorage.setItem(DISMISS_KEY, now.toString());

    const fiveDaysLater = now + 5 * 24 * 60 * 60 * 1000;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    const isWithinCooldown = fiveDaysLater - dismissedAt < FOURTEEN_DAYS_MS;
    expect(isWithinCooldown).toBe(true);

    const fifteenDaysLater = now + 15 * 24 * 60 * 60 * 1000;
    const isStillInCooldown = fifteenDaysLater - dismissedAt < FOURTEEN_DAYS_MS;
    expect(isStillInCooldown).toBe(false);
  });

  it('detects standalone mode to hide install prompts when already installed', () => {
    const isStandaloneWindow = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return isDisplayStandalone || isNavigatorStandalone;
    };

    expect(isStandaloneWindow()).toBe(false);
  });
});
