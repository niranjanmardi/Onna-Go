import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Initializes native Android & iOS Capacitor mobile integration.
 * On web platforms, this module safely performs no-ops.
 */
export function initCapacitorMobile(): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  // 1. Hide native splash screen once React is mounted and interactive
  SplashScreen.hide().catch(() => {
    // Ignore errors in environments where splash is not available
  });

  // 2. Configure Android Status Bar: disable overlay and match ONNA-GO brand
  try {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    // On both green (#16834A) and dark (#0A0A0A) backgrounds, icons must be light/white (Style.Dark) for clear readability
    StatusBar.setStyle({
      style: Style.Dark,
    }).catch(() => {});

    // On Android, match top brand color or dark surface
    if (Capacitor.getPlatform() === 'android') {
      const isDark = document.documentElement.classList.contains('dark');
      StatusBar.setBackgroundColor({
        color: isDark ? '#0A0A0A' : '#16834A',
      }).catch(() => {});
    }
  } catch {
    // Non-fatal if status bar API fails
  }

  // 3. Android Hardware Back Button Handling
  let backListenerRemove: (() => void) | null = null;
  CapApp.addListener('backButton', ({ canGoBack }) => {
    const currentPath = window.location.pathname;
    const isRootPage =
      currentPath === '/' ||
      currentPath === '/dashboard' ||
      currentPath === '/login';

    if (isRootPage) {
      // Exit app if on primary landing/root screens
      CapApp.exitApp();
    } else if (canGoBack || window.history.length > 1) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  }).then((handle) => {
    backListenerRemove = () => handle.remove();
  }).catch(() => {});

  // Cleanup handler
  return () => {
    if (backListenerRemove) {
      backListenerRemove();
    }
  };
}

/**
 * Dynamically synchronize Android status bar with ThemeContext transitions
 */
export function syncNativeStatusBarTheme(isDark: boolean): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  try {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    StatusBar.setStyle({
      style: Style.Dark,
    }).catch(() => {});

    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({
        color: isDark ? '#0A0A0A' : '#16834A',
      }).catch(() => {});
    }
  } catch {
    // Non-fatal
  }
}
