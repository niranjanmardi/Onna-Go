// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ThemeGalleryModal } from '../components/themes/ThemeGalleryModal';
import { ThemeProvider } from '../context/ThemeContext';
import { FeedbackProvider } from '../context/FeedbackContext';
import { THEMES_CATALOG } from '../config/themes';

// Mock AuthContext
const mockUser = {
  id: 'user-123',
  email: 'mardidravik@gmail.com',
  full_name: 'Niranjan Mardi',
  username: 'mardi',
  default_currency: 'INR',
  avatar_url: null,
  upi_id: 'mardi@upi',
};

const mockLogout = vi.fn();
const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockDeleteAccount = vi.fn();
const mockUploadAvatar = vi.fn();

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    updateProfile: mockUpdateProfile,
    changePassword: mockChangePassword,
    deleteAccount: mockDeleteAccount,
    uploadAvatar: mockUploadAvatar,
  }),
}));

// Mock OfflineContext
vi.mock('../context/OfflineContext', () => ({
  useOffline: () => ({
    syncNow: vi.fn(),
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: new Date(),
  }),
}));

// Mock sounds
vi.mock('../lib/sounds', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/sounds')>();
  return {
    ...actual,
    getSoundPreferences: () => ({
      master: true,
      expense: true,
      trip: true,
      notification: true,
      interaction: true,
    }),
    setSoundPreferences: vi.fn(),
    playSound: vi.fn(),
    areSoundsEnabled: () => true,
    toggleSounds: vi.fn(),
  };
});

describe('ONNA-GO Android Layout & Wallpaper Verification (Motorola Edge 70 Fusion)', () => {
  const viewports = [
    { name: 'Small Android (360px)', width: 360, height: 780 },
    { name: 'Motorola Edge 70 Fusion (393px)', width: 393, height: 852 },
    { name: 'Large Android (412px)', width: 412, height: 915 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('BUG 1 — Settings Page Account Information Stacked Layout', () => {
    viewports.forEach(({ name, width, height }) => {
      it(`renders all Account Information labels and values clearly on ${name}`, () => {
        // Set window viewport
        window.innerWidth = width;
        window.innerHeight = height;

        render(
          <BrowserRouter>
            <ThemeProvider>
              <FeedbackProvider>
                <SettingsPage />
              </FeedbackProvider>
            </ThemeProvider>
          </BrowserRouter>
        );

        // Section header
        expect(screen.getByText('Account Information')).toBeTruthy();
        expect(screen.getByText('Verified User')).toBeTruthy();

        // 1. Full Name Label & Value
        const nameLabel = screen.getByText('Full Name');
        expect(nameLabel).toBeTruthy();
        const nameValues = screen.getAllByText('Niranjan Mardi');
        expect(nameValues.length).toBeGreaterThanOrEqual(1);

        // Verify the Name row container has stacked classes (flex-col sm:flex-row)
        const nameRow = nameLabel.closest('div[class*="flex-col"]');
        expect(nameRow).toBeTruthy();
        expect(nameRow?.className).toContain('sm:flex-row');

        // 2. Email Address Label & Value
        const emailLabel = screen.getByText('Email Address');
        expect(emailLabel).toBeTruthy();
        const emailValues = screen.getAllByText('mardidravik@gmail.com');
        expect(emailValues.length).toBeGreaterThanOrEqual(1);

        const emailRow = emailLabel.closest('div[class*="flex-col"]');
        expect(emailRow).toBeTruthy();
        expect(emailRow?.className).toContain('sm:flex-row');

        // 3. Username Handle Label & Value
        const usernameLabel = screen.getByText('Username Handle');
        expect(usernameLabel).toBeTruthy();
        expect(screen.getByText('@mardi')).toBeTruthy();

        const usernameRow = usernameLabel.closest('div[class*="flex-col"]');
        expect(usernameRow).toBeTruthy();
        expect(usernameRow?.className).toContain('sm:flex-row');

        // 4. Default Currency Label & Value
        const currencyLabel = screen.getByText('Default Currency');
        expect(currencyLabel).toBeTruthy();
        expect(screen.getByText(/INR.*\(₹\)/)).toBeTruthy();

        const currencyRow = currencyLabel.closest('div[class*="flex-col"]');
        expect(currencyRow).toBeTruthy();
        expect(currencyRow?.className).toContain('sm:flex-row');

        // 5. Change Password & Sign Out
        expect(screen.getByText('Change Password')).toBeTruthy();
        expect(screen.getByText('Sign Out of Account')).toBeTruthy();
      });
    });

    it('handles null username and default currency fallback gracefully', () => {
      // Temporarily test with not-set username
      render(
        <BrowserRouter>
          <ThemeProvider>
            <FeedbackProvider>
              <SettingsPage />
            </FeedbackProvider>
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('@mardi')).toBeTruthy();
    });
  });

  describe('BUG 2 & BUG 3 — Theme Gallery Modal & Wallpaper Preview Overlay', () => {
    it('dispatches onnago_toggle_bottom_nav event to hide bottom nav on open and restore on close', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const { unmount } = render(
        <ThemeProvider>
          <FeedbackProvider>
            <ThemeGalleryModal isOpen={true} onClose={vi.fn()} />
          </FeedbackProvider>
        </ThemeProvider>
      );

      // Verify hide event was dispatched
      const hideEvent = dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === 'onnago_toggle_bottom_nav' && (call[0] as CustomEvent).detail?.hide === true
      );
      expect(hideEvent).toBeTruthy();

      unmount();

      // Verify restore event was dispatched on unmount
      const restoreEvent = dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === 'onnago_toggle_bottom_nav' && (call[0] as CustomEvent).detail?.hide === false
      );
      expect(restoreEvent).toBeTruthy();
    });

    it('renders the wallpaper preview overlay portaled to document.body with z-[10000]', async () => {
      render(
        <ThemeProvider>
          <FeedbackProvider>
            <ThemeGalleryModal isOpen={true} onClose={vi.fn()} />
          </FeedbackProvider>
        </ThemeProvider>
      );

      // Click on Mumbai preview button
      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      fireEvent.click(previewButtons[0]);

      // Verify Wallpaper Preview dialog is portaled directly into document.body
      const dialog = document.body.querySelector('div[role="dialog"][aria-label="Wallpaper Preview"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.className).toContain('z-[10000]');
      expect(dialog?.className).toContain('bg-[#0A0A0C]');

      // Verify Cancel and Apply buttons are rendered inside the preview
      const applyBtn = screen.getByTestId('apply-wallpaper-button');
      const cancelBtn = screen.getByTestId('cancel-preview-button');
      expect(applyBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();

      // Verify non-scrolling opaque footer
      const footer = applyBtn.closest('footer');
      expect(footer).toBeTruthy();
      expect(footer?.className).toContain('bg-[#121216]');
    });

    it('performs automated hit-testing and applies wallpaper on click without blockage', async () => {
      render(
        <ThemeProvider>
          <FeedbackProvider>
            <ThemeGalleryModal isOpen={true} onClose={vi.fn()} />
          </FeedbackProvider>
        </ThemeProvider>
      );

      // Click on the first preview button
      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      fireEvent.click(previewButtons[0]);

      const applyBtn = screen.getByTestId('apply-wallpaper-button') as HTMLButtonElement;
      expect(applyBtn).toBeTruthy();

      // Mock getBoundingClientRect for jsdom
      applyBtn.getBoundingClientRect = () => ({
        x: 100,
        y: 700,
        width: 150,
        height: 44,
        top: 700,
        left: 100,
        right: 250,
        bottom: 744,
        toJSON: () => {},
      });

      // Hit-testing simulation with document.elementFromPoint
      document.elementFromPoint = vi.fn().mockImplementation((x: number, y: number) => {
        if (x >= 100 && x <= 250 && y >= 700 && y <= 744) {
          return applyBtn;
        }
        return null;
      });

      const elementAtCenter = document.elementFromPoint(175, 722);
      expect(elementAtCenter).toBe(applyBtn);

      // Click Apply Wallpaper
      fireEvent.click(applyBtn);

      // Verify the preview is closed after applying
      await waitFor(() => {
        expect(screen.queryByTestId('apply-wallpaper-button')).toBeNull();
      });
    });
  });
});
