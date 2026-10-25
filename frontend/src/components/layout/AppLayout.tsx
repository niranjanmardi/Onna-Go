import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { getAvatarUrl } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/offline/OfflineBanner';

// Custom filled and outline navigation icons
const HomeIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
};

const TripsIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.8 6.2-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
};

const FriendsIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2z" />
        <circle cx="9" cy="7" r="4" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75A4 4 0 0 1 12 15a4 4 0 0 0 4-4 4 4 0 0 0 0-7.87z" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87A4 4 0 0 1 20 19v2z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
};

const ProfileIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { playClick } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAddAction = () => {
    playClick();
    // Dispatch an event in case active page handles quick expense adding
    const handled = window.dispatchEvent(new CustomEvent('app-add-action', { cancelable: true }));
    if (handled) {
      // If not prevented by page, default to creating a new trip
      navigate('/trips/new');
    }
  };

  const isHomeActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isTripsActive = location.pathname.startsWith('/trips');
  const isFriendsActive = location.pathname.startsWith('/friends');
  const isProfileActive = location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile');

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] flex flex-col md:flex-row text-[#171717] dark:text-[#EDEDED] transition-colors duration-200">
      {/* PWA Custom Install Prompt Banner */}
      <InstallPrompt />

      {/* --- Desktop Slim Left Sidebar --- */}
      <aside className="hidden md:flex flex-col w-16 h-screen sticky top-0 bg-[#FAFAF8] dark:bg-[#121212] border-r border-[#E8E8E5] dark:border-[#262626] py-5 items-center justify-between select-none z-30">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Brand Monogram */}
          <button
            onClick={() => {
              playClick();
              navigate('/dashboard');
            }}
            className="w-10 h-10 rounded-xl bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center font-bold text-base hover:opacity-95 active:scale-95 transition-transform cursor-pointer"
            title="Onna-Go Home"
          >
            O
          </button>

          {/* Navigation Items (Slim desktop) */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            <NavLink
              to="/dashboard"
              onClick={playClick}
              title="Home"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isHomeActive
                  ? 'text-[#171717] dark:text-[#EDEDED] bg-white dark:bg-[#1C1C1C] border border-[#E8E8E5] dark:border-[#2E2E2E]'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              <HomeIcon filled={isHomeActive} />
            </NavLink>

            <NavLink
              to="/trips"
              onClick={playClick}
              title="Trips"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isTripsActive
                  ? 'text-[#171717] dark:text-[#EDEDED] bg-white dark:bg-[#1C1C1C] border border-[#E8E8E5] dark:border-[#2E2E2E]'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              <TripsIcon filled={isTripsActive} />
            </NavLink>

            {/* Desktop Add Action */}
            <button
              onClick={handleAddAction}
              title="Add Expense / Trip"
              className="w-10 h-10 my-1 rounded-xl bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>

            <NavLink
              to="/friends"
              onClick={playClick}
              title="Friends"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isFriendsActive
                  ? 'text-[#171717] dark:text-[#EDEDED] bg-white dark:bg-[#1C1C1C] border border-[#E8E8E5] dark:border-[#2E2E2E]'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              <FriendsIcon filled={isFriendsActive} />
            </NavLink>

            <NavLink
              to="/profile"
              onClick={playClick}
              title="Profile"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isProfileActive
                  ? 'text-[#171717] dark:text-[#EDEDED] bg-white dark:bg-[#1C1C1C] border border-[#E8E8E5] dark:border-[#2E2E2E]'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              <ProfileIcon filled={isProfileActive} />
            </NavLink>
          </nav>
        </div>

        {/* Desktop Sidebar Bottom (Profile Avatar & Sign Out) */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div
            onClick={() => {
              playClick();
              navigate('/profile');
            }}
            title={user?.full_name || 'Profile'}
            className="cursor-pointer"
          >
            {user?.avatar_url ? (
              <img
                src={getAvatarUrl(user.avatar_url)}
                alt={user.full_name}
                className="w-9 h-9 rounded-full object-cover border border-[#E8E8E5] dark:border-[#262626]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] flex items-center justify-center font-semibold text-xs uppercase">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-[#737373] dark:text-[#8E8E93] hover:text-[#E11D48] dark:hover:text-[#F43F5E] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        <OfflineBanner />
        <Outlet />
      </main>

      {/* --- Mobile Bottom Tab Bar (Home, Trips, Add, Friends, Profile) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-[#E8E8E5] dark:border-[#262626] pb-safe flex items-center justify-around h-16 px-1 select-none">
        {/* Home */}
        <NavLink
          to="/dashboard"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isHomeActive
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold'
              : 'text-[#737373] dark:text-[#8E8E93]'
          }`}
        >
          <HomeIcon filled={isHomeActive} />
          <span className="text-[10px] mt-1">Home</span>
        </NavLink>

        {/* Trips */}
        <NavLink
          to="/trips"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isTripsActive
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold'
              : 'text-[#737373] dark:text-[#8E8E93]'
          }`}
        >
          <TripsIcon filled={isTripsActive} />
          <span className="text-[10px] mt-1">Trips</span>
        </NavLink>

        {/* Add Button */}
        <button
          onClick={handleAddAction}
          className="flex flex-col items-center justify-center flex-1 py-1 active:scale-95 transition-transform"
          aria-label="Add"
        >
          <div className="w-10 h-10 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center shadow-md">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
        </button>

        {/* Friends */}
        <NavLink
          to="/friends"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isFriendsActive
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold'
              : 'text-[#737373] dark:text-[#8E8E93]'
          }`}
        >
          <FriendsIcon filled={isFriendsActive} />
          <span className="text-[10px] mt-1">Friends</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isProfileActive
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold'
              : 'text-[#737373] dark:text-[#8E8E93]'
          }`}
        >
          <ProfileIcon filled={isProfileActive} />
          <span className="text-[10px] mt-1">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default AppLayout;
