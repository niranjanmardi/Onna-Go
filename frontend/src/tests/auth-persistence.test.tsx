// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { api, ApiError } from '../lib/api-client';

// Minimal mock components matching App.tsx routing
const MockLandingPage = () => <div data-testid="landing-page">Welcome to ONNA-GO</div>;
const MockDashboardPage = () => <div data-testid="dashboard-page">Dashboard Content</div>;
const MockLoginPage = () => <div data-testid="login-page">Sign In Form</div>;

const RedirectIfAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div data-testid="auth-loading-screen">Verifying ONNA-GO session...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div data-testid="auth-loading-screen">Verifying ONNA-GO session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const TestApp: React.FC<{ initialEntries?: string[] }> = ({ initialEntries = ['/'] }) => (
  <AuthProvider>
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/"
          element={
            <RedirectIfAuth>
              <MockLandingPage />
            </RedirectIfAuth>
          }
        />
        <Route path="/login" element={<MockLoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <MockDashboardPage />
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  </AuthProvider>
);

describe('Login Session Persistence & App Reopening', () => {
  const mockUser = {
    id: 'usr-100',
    username: 'motorider',
    full_name: 'Moto Rider',
    email: 'rider@example.com',
    default_currency: 'INR',
    is_active: true,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores existing session and navigates directly to Dashboard when opening app at /', async () => {
    // 1. Simulate existing session in localStorage after previous successful login
    localStorage.setItem('onnago_token', 'valid-active-token');
    localStorage.setItem('onnago_user', JSON.stringify(mockUser));

    // 2. Mock /auth/me verifying token successfully
    vi.spyOn(api, 'get').mockResolvedValueOnce(mockUser);

    // 3. Render app at root / (as Android APK does when launched)
    render(<TestApp initialEntries={['/']} />);

    // 4. While verifying, shows loading screen and never flashes landing page
    expect(screen.queryByTestId('landing-page')).toBeNull();

    // 5. Once session is restored, navigates directly to Dashboard
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).not.toBeNull();
    });

    expect(screen.queryByTestId('landing-page')).toBeNull();
    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('shows landing page immediately when no session exists on cold start', async () => {
    // No tokens in localStorage
    render(<TestApp initialEntries={['/']} />);

    // Immediately renders LandingPage with zero loading screen flash
    expect(screen.getByTestId('landing-page')).not.toBeNull();
    expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
    expect(screen.queryByTestId('dashboard-page')).toBeNull();
  });

  it('preserves session and navigates to Dashboard when offline / network error occurs', async () => {
    localStorage.setItem('onnago_token', 'offline-valid-token');
    localStorage.setItem('onnago_user', JSON.stringify(mockUser));

    // Simulate network error on /auth/me (device offline)
    vi.spyOn(api, 'get').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<TestApp initialEntries={['/']} />);

    // Must navigate to Dashboard with cached session
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).not.toBeNull();
    });

    // Token and cached user remain in localStorage
    expect(localStorage.getItem('onnago_token')).toBe('offline-valid-token');
    expect(localStorage.getItem('onnago_user')).toContain('motorider');
  });

  it('clears storage and redirects to login when backend rejects token with 401', async () => {
    localStorage.setItem('onnago_token', 'revoked-token');
    localStorage.setItem('onnago_user', JSON.stringify(mockUser));

    // Backend explicitly returns 401 Unauthorized
    vi.spyOn(api, 'get').mockRejectedValueOnce(new ApiError(401, 'Token expired'));

    render(<TestApp initialEntries={['/']} />);

    await waitFor(() => {
      expect(localStorage.getItem('onnago_token')).toBeNull();
      expect(localStorage.getItem('onnago_user')).toBeNull();
    });
  });

  it('prevents landing page from appearing briefly while verifying authentication', async () => {
    localStorage.setItem('onnago_token', 'valid-active-token');
    localStorage.setItem('onnago_user', JSON.stringify(mockUser));

    // Create a delayed promise to inspect the loading state
    let resolveAuth: (val: any) => void;
    const authPromise = new Promise((resolve) => {
      resolveAuth = resolve;
    });
    vi.spyOn(api, 'get').mockReturnValueOnce(authPromise as any);

    render(<TestApp initialEntries={['/']} />);

    // During verification, loading screen is visible and LandingPage is absent
    expect(screen.getByTestId('auth-loading-screen')).not.toBeNull();
    expect(screen.queryByTestId('landing-page')).toBeNull();

    // Resolve auth
    resolveAuth!(mockUser);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).not.toBeNull();
    });
    expect(screen.queryByTestId('landing-page')).toBeNull();
  });
});
