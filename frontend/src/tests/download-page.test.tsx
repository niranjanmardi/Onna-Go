// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DownloadPage } from '../features/download/DownloadPage';
import { ANDROID_APK_CONFIG } from '../config/apk-config';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../features/auth/AuthContext';

describe('Android Download Page & APK Configuration', () => {
  beforeEach(() => {
    // Mock window.matchMedia for JSDOM
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('has verified APK configuration attributes', () => {
    expect(ANDROID_APK_CONFIG.appName).toBe('ONNA-GO');
    expect(ANDROID_APK_CONFIG.packageId).toBe('com.onnago.app');
    expect(ANDROID_APK_CONFIG.version).toBe('1.0.0');
    expect(ANDROID_APK_CONFIG.versionCode).toBe(1);
    expect(ANDROID_APK_CONFIG.apkSizeFormatted).toBe('4.5 MB');
    expect(ANDROID_APK_CONFIG.apkSizeBytes).toBe(4680325);
    expect(ANDROID_APK_CONFIG.minAndroidVersion).toContain('Android 7.0');
    expect(ANDROID_APK_CONFIG.targetAndroidVersion).toContain('Android 15');
    expect(ANDROID_APK_CONFIG.fileName).toBe('onna-go.apk');
    expect(ANDROID_APK_CONFIG.downloadUrl).toBeDefined();
    expect(ANDROID_APK_CONFIG.tagline).toBe('Ride Together. Vibe Together. Split Together.');
  });

  it('renders branding, headline, tagline, and both CTAs on DownloadPage', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <DownloadPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Headline check
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('Every Trip. Every Expense.');
    expect(h1.textContent).toContain('One Simple App.');

    // Tagline check
    const taglines = screen.getAllByText('Ride Together. Vibe Together. Split Together.');
    expect(taglines.length).toBeGreaterThanOrEqual(1);

    // Primary CTA check
    const downloadBtns = screen.getAllByRole('button', { name: /Download for Android/i });
    expect(downloadBtns.length).toBeGreaterThanOrEqual(1);

    // Secondary CTA check
    const webAppBtn = screen.getByRole('button', { name: /Continue to Web App/i });
    expect(webAppBtn).toBeTruthy();

    // Features section check
    expect(screen.getByText('Group Expense Tracking')).toBeTruthy();
    expect(screen.getByText('Automatic Expense Splitting')).toBeTruthy();
    expect(screen.getByText('Clear Member Balances')).toBeTruthy();
    expect(screen.getAllByText('Debt Simplification').length).toBeGreaterThanOrEqual(1);

    // 3-Step installation guide check
    expect(screen.getByText('Download the APK')).toBeTruthy();
    expect(screen.getByText('Allow Unknown Source')).toBeTruthy();
    expect(screen.getByText('Install & Sign In')).toBeTruthy();

    // Verified specs check
    expect(screen.getByText('com.onnago.app')).toBeTruthy();
    expect(screen.getByText('v1.0.0 (Build 1)')).toBeTruthy();
  });

  it('opens confirmation modal with instructions when Download for Android is clicked', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <DownloadPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const downloadBtn = screen.getAllByRole('button', { name: /Download for Android/i })[0];
    fireEvent.click(downloadBtn);

    // Confirmation modal should appear
    expect(screen.getByText('Download Initiated')).toBeTruthy();
    expect(screen.getByText(/Your browser should start downloading the APK automatically/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Got It/i })).toBeTruthy();
  });
});
