import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TripsListPage } from './features/trips/TripsListPage';
import { TripDetailPage } from './features/trips/TripDetailPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { FriendsPage } from './features/friends/FriendsPage';
import { Logo } from './components/brand/Logo';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Protected Route Guard
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center text-[#171717]">
        <Logo size="lg" showTagline={true} theme="light" />
        <div className="w-7 h-7 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin mt-6" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (redirects to dashboard if already authenticated)
const RedirectIfAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center text-[#171717]">
        <Logo size="lg" showTagline={true} theme="light" />
        <div className="w-7 h-7 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin mt-6" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// 404 Page
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col items-center justify-center p-6 text-center">
      <Logo size="lg" showTagline={false} theme="light" />
      <h1 className="text-5xl font-bold text-[#171717] mt-6 font-mono tabular-nums">404</h1>
      <h2 className="text-lg font-bold mt-2">Route Not Found</h2>
      <p className="text-[#737373] text-sm mt-1 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href="/dashboard"
        className="mt-6 px-5 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white font-medium text-sm rounded-xl shadow-xs transition-colors"
      >
        Back to Dashboard
      </a>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth routes */}
            <Route
              path="/login"
              element={
                <RedirectIfAuth>
                  <LoginPage />
                </RedirectIfAuth>
              }
            />
            <Route
              path="/register"
              element={
                <RedirectIfAuth>
                  <RegisterPage />
                </RedirectIfAuth>
              }
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/trips" element={<TripsListPage />} />
              <Route path="/trips/new" element={<TripsListPage />} />
              <Route path="/trips/join" element={<TripsListPage />} />
              <Route path="/trips/:id" element={<TripDetailPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<SettingsPage />} />
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
