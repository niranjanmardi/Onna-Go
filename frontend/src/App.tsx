import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { FeedbackProvider } from './context/FeedbackContext';
import { Logo } from './components/brand/Logo';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy-loaded route components for high performance and fast initial load
const LandingPage = React.lazy(() => import('./features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import('./features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./features/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const DashboardPage = React.lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TripsListPage = React.lazy(() => import('./features/trips/TripsListPage').then(m => ({ default: m.TripsListPage })));
const TripDetailPage = React.lazy(() => import('./features/trips/TripDetailPage').then(m => ({ default: m.TripDetailPage })));
const NotificationsPage = React.lazy(() => import('./features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SettingsPage = React.lazy(() => import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const FriendsPage = React.lazy(() => import('./features/friends/FriendsPage').then(m => ({ default: m.FriendsPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center" aria-live="polite">
    <div className="w-7 h-7 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin" />
    <span className="sr-only">Loading section...</span>
  </div>
);

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
        <FeedbackProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
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
                  <Route path="/history" element={<TripsListPage />} />
                  <Route path="/trips/:id" element={<TripDetailPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/friends" element={<FriendsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<SettingsPage />} />
                </Route>

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </FeedbackProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;

