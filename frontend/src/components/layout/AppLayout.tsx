import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Plus, LogOut, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl, api } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { Trip } from '@/types';
import { getCachedTripsList } from '@/lib/offline-db';
import { determineAddExpenseAction } from '@/lib/add-expense-coordinator';

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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2z" />
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
  const { activeThemeId, activeTheme, overlayOpacity, overlayStyle, blurLevel, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [isTripPickerOpen, setIsTripPickerOpen] = useState(false);
  const [isNoTripsSheetOpen, setIsNoTripsSheetOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAddExpenseClick = async () => {
    playClick();
    // Dispatch an event so an active TripDetailPage can open directly
    const event = new CustomEvent('app-add-action', { cancelable: true });
    const notPrevented = window.dispatchEvent(event);
    if (!notPrevented) {
      // Current trip page handled the action
      return;
    }

    // Outside of a trip page: fetch or load active trips
    let tripsList: Trip[] = [];
    try {
      tripsList = await api.get<Trip[]>('/trips/?include_archived=true');
    } catch {
      tripsList = await getCachedTripsList().catch(() => []);
    }

    const action = determineAddExpenseAction(location.pathname, tripsList);
    if (action.type === 'CURRENT_TRIP') {
      navigate(`/trips/${action.tripId}?action=add-expense`);
    } else if (action.type === 'NAVIGATE_TO_TRIP') {
      navigate(action.url);
    } else if (action.type === 'SHOW_TRIP_PICKER') {
      setActiveTrips(action.trips);
      setIsTripPickerOpen(true);
    } else if (action.type === 'SHOW_CREATE_FIRST_TRIP_SHEET') {
      setIsNoTripsSheetOpen(true);
    }
  };

  const isHomeActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isTripsActive = location.pathname.startsWith('/trips');
  const isFriendsActive = location.pathname.startsWith('/friends');
  const isProfileActive = location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile');

  const hasCustomWallpaper = Boolean(activeTheme?.full_url);

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row text-white relative">

      {/* PWA Custom Install Prompt Banner */}
      <InstallPrompt />

      {/* --- Desktop Slim Left Sidebar (Apple Glass Floating Navigation) --- */}
      <aside className="hidden md:flex flex-col w-20 h-screen sticky top-0 glass-nav border-r border-white/25 py-6 items-center justify-between select-none z-30 transition-all">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Brand Monogram */}
          <button
            onClick={() => {
              playClick();
              navigate('/dashboard');
            }}
            className="w-11 h-11 rounded-2xl bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center font-bold text-base hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Onna-Go Home"
          >
            O
          </button>

          {/* Navigation Items (Slim desktop) */}
          <nav className="flex flex-col items-center gap-2.5 w-full px-2.5">
            <NavLink
              to="/dashboard"
              onClick={playClick}
              title="Home"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isHomeActive
                  ? 'text-[#16834A] dark:text-[#22C55E] bg-white/95 dark:bg-white/15 border border-white/50 dark:border-white/20 shadow-md scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <HomeIcon filled={isHomeActive} />
            </NavLink>

            <NavLink
              to="/trips"
              onClick={playClick}
              title="Trips"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isTripsActive
                  ? 'text-[#16834A] dark:text-[#22C55E] bg-white/95 dark:bg-white/15 border border-white/50 dark:border-white/20 shadow-md scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <TripsIcon filled={isTripsActive} />
            </NavLink>

            {/* Desktop Add Action */}
            <button
              onClick={handleAddExpenseClick}
              title="Add expense"
              aria-label="Add expense"
              className="w-11 h-11 my-1.5 rounded-2xl bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            <NavLink
              to="/friends"
              onClick={playClick}
              title="Friends"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isFriendsActive
                  ? 'text-[#16834A] dark:text-[#22C55E] bg-white/95 dark:bg-white/15 border border-white/50 dark:border-white/20 shadow-md scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <FriendsIcon filled={isFriendsActive} />
            </NavLink>

            <NavLink
              to="/profile"
              onClick={playClick}
              title="Profile"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isProfileActive
                  ? 'text-[#16834A] dark:text-[#22C55E] bg-white/95 dark:bg-white/15 border border-white/50 dark:border-white/20 shadow-md scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
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
      <main className="relative z-10 flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        <OfflineBanner />
        <Outlet />
      </main>

      {/* --- Mobile Bottom Tab Bar (Apple Glass Navigation) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-white/25 flex items-center justify-around h-16 px-1 select-none pb-safe">
        {/* Home */}
        <NavLink
          to="/dashboard"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isHomeActive
              ? 'text-[#16834A] dark:text-[#22C55E] font-bold scale-105'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium'
          }`}
        >
          <HomeIcon filled={isHomeActive} />
          <span className="text-[10px] mt-1 font-semibold">Home</span>
        </NavLink>

        {/* Trips */}
        <NavLink
          to="/trips"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isTripsActive
              ? 'text-[#16834A] dark:text-[#22C55E] font-bold scale-105'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium'
          }`}
        >
          <TripsIcon filled={isTripsActive} />
          <span className="text-[10px] mt-1 font-semibold">Trips</span>
        </NavLink>

        {/* Add Expense Button */}
        <button
          onClick={handleAddExpenseClick}
          className="flex flex-col items-center justify-center flex-1 py-1 active:scale-95 transition-transform cursor-pointer"
          aria-label="Add expense"
        >
          <div className="w-10 h-10 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center shadow-lg hover:brightness-105 transition-all">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
        </button>

        {/* Friends */}
        <NavLink
          to="/friends"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isFriendsActive
              ? 'text-[#16834A] dark:text-[#22C55E] font-bold scale-105'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium'
          }`}
        >
          <FriendsIcon filled={isFriendsActive} />
          <span className="text-[10px] mt-1 font-semibold">Friends</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isProfileActive
              ? 'text-[#16834A] dark:text-[#22C55E] font-bold scale-105'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium'
          }`}
        >
          <ProfileIcon filled={isProfileActive} />
          <span className="text-[10px] mt-1 font-semibold">Profile</span>
        </NavLink>
      </nav>

      {/* --- Trip Picker Sheet (Apple Liquid Glass Modal) --- */}
      {isTripPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/20">
              <h3 className="text-base font-semibold text-white">
                Select trip for expense
              </h3>
              <button
                onClick={() => setIsTripPickerOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-white/10 max-h-60 overflow-y-auto">
              {activeTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => {
                    setIsTripPickerOpen(false);
                    navigate(`/trips/${trip.id}?action=add-expense`);
                  }}
                  className="w-full text-left py-3 px-2 flex items-center justify-between hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#171717] dark:text-[#EDEDED] truncate">
                    {trip.name}
                  </span>
                  <span className="text-xs text-[#737373] dark:text-[#8E8E93] shrink-0 ml-2">
                    {trip.members_count || 1} {trip.members_count === 1 ? 'person' : 'people'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- No Active Trips Sheet --- */}
      {isNoTripsSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E8E8E5] dark:border-[#262626] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#EDEDED]">
                Add expense
              </h3>
              <button
                onClick={() => setIsNoTripsSheetOpen(false)}
                className="p-1 rounded-lg text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[#737373] dark:text-[#8E8E93] leading-relaxed">
              Create a trip to start adding expenses.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNoTripsSheetOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNoTripsSheetOpen(false);
                  navigate('/trips/new');
                }}
                className="px-4 py-2 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0A0A0A] text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Create trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
