import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Plus, LogOut, X, Compass, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl, api } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { Trip } from '@/types';
import { getCachedTripsList } from '@/lib/offline-db';
import { determineAddExpenseAction } from '@/lib/add-expense-coordinator';
import { GlassModal, GlassButton } from '@/components/glass';
import { UserAvatar } from '@/components/common/UserAvatar';

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

const MessagesIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.02 2 11c0 2.87 1.5 5.43 3.84 7.07L5.05 21.6c-.18.52.33.99.82.78l3.66-1.57c.78.13 1.6.19 2.47.19 5.52 0 10-4.02 10-9s-4.48-9-10-9z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21a9 9 0 1 0-9-9c0 1.48.36 2.88 1 4.12L3 21l4.88-1c1.24.64 2.64 1 4.12 1z" />
    </svg>
  );
};

const FeedIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-7-4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.17l-1.42-2.13A2 2 0 0 0 11.75 2h-3.5a2 2 0 0 0-1.66.87L5.17 5H5z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
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
  const isFeedActive = location.pathname.startsWith('/feed') || location.pathname.startsWith('/social') || location.pathname.startsWith('/memories');
  const isMessagesActive = location.pathname.startsWith('/messages');
  const isFriendsActive = location.pathname.startsWith('/friends');
  const isProfileActive = location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile');
  const isInsideConversation =
    (location.pathname.startsWith('/messages/') && location.pathname !== '/messages') ||
    (location.pathname === '/messages' &&
      (location.search.includes('tripId') || location.search.includes('friendId')));

  // Listen for full-screen overlay state (e.g. Wallpaper Preview, full-screen sheets) to completely hide bottom navigation
  const [isHideBottomNav, setIsHideBottomNav] = useState(false);
  useEffect(() => {
    const handleToggleNav = (e: any) => {
      setIsHideBottomNav(Boolean(e.detail?.hide));
    };
    window.addEventListener('onnago_toggle_bottom_nav', handleToggleNav);
    return () => window.removeEventListener('onnago_toggle_bottom_nav', handleToggleNav);
  }, []);

  const hasCustomWallpaper = Boolean(activeTheme?.full_url);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-transparent flex flex-col md:flex-row text-white relative overflow-hidden">

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
                  ? 'text-[var(--theme-accent,#22C55E)] bg-white/25 border border-white/40 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
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
                  ? 'text-[var(--theme-accent,#22C55E)] bg-white/25 border border-white/40 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              <TripsIcon filled={isTripsActive} />
            </NavLink>

            <NavLink
              to="/feed"
              onClick={playClick}
              title="Moments & Feed"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isFeedActive
                  ? 'text-[var(--theme-accent,#22C55E)] bg-white/25 border border-white/40 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              <FeedIcon filled={isFeedActive} />
            </NavLink>

            <NavLink
              to="/messages"
              onClick={playClick}
              title="Messages"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isMessagesActive
                  ? 'text-[var(--theme-accent,#22C55E)] bg-white/25 border border-white/40 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              <MessagesIcon filled={isMessagesActive} />
            </NavLink>

            {/* Desktop Add Action */}
            <button
              onClick={handleAddExpenseClick}
              title="Add expense"
              aria-label="Add expense"
              className="w-11 h-11 my-1.5 rounded-2xl bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] flex items-center justify-center hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            <NavLink
              to="/friends"
              onClick={playClick}
              title="Friends"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isFriendsActive
                  ? 'text-[var(--theme-accent,#22C55E)] bg-white/25 border border-white/40 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              <FriendsIcon filled={isFriendsActive} />
            </NavLink>

            <NavLink
              to="/settings"
              onClick={playClick}
              title="Settings"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isProfileActive
                  ? 'text-[var(--theme-accent,#22C55E)] bg-white/25 border border-white/40 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
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
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <UserAvatar
              name={user?.full_name}
              avatarUrl={user?.avatar_url}
              size="sm"
            />
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-white/60 hover:text-rose-300 hover:bg-white/15 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main
        className={`relative z-10 flex-1 flex flex-col min-w-0 min-h-0 h-full ${
          isInsideConversation
            ? 'pb-0 overflow-hidden'
            : isMessagesActive
            ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 overflow-hidden'
            : 'overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
        }`}
      >
        <OfflineBanner />
        <Outlet />
      </main>

      {/* --- Mobile Bottom Tab Bar (Apple Glass Navigation: Home | Trips | Add | Chats | Profile) --- */}
      {!isInsideConversation && !isHideBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-white/25 flex items-center justify-around min-h-[4rem] h-[calc(4rem+env(safe-area-inset-bottom,0px))] px-1 select-none pb-safe">
        {/* Home */}
        <NavLink
          to="/dashboard"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isHomeActive
              ? 'text-[var(--theme-accent,#22C55E)] font-bold scale-105'
              : 'text-white/70 hover:text-white font-medium'
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
              ? 'text-[var(--theme-accent,#22C55E)] font-bold scale-105'
              : 'text-white/70 hover:text-white font-medium'
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
          <div className="w-10 h-10 rounded-full bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] flex items-center justify-center shadow-lg hover:brightness-105 transition-all">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
        </button>

        {/* Chats (Messages) */}
        <NavLink
          to="/messages"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isMessagesActive
              ? 'text-[var(--theme-accent,#22C55E)] font-bold scale-105'
              : 'text-white/70 hover:text-white font-medium'
          }`}
        >
          <MessagesIcon filled={isMessagesActive} />
          <span className="text-[10px] mt-1 font-semibold">Chats</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          onClick={playClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isProfileActive
              ? 'text-[var(--theme-accent,#22C55E)] font-bold scale-105'
              : 'text-white/70 hover:text-white font-medium'
          }`}
        >
          <ProfileIcon filled={isProfileActive} />
          <span className="text-[10px] mt-1 font-semibold">Profile</span>
        </NavLink>
      </nav>
      )}

      {/* --- Trip Picker Modal (GlassModal) --- */}
      <GlassModal
        isOpen={isTripPickerOpen}
        onClose={() => setIsTripPickerOpen(false)}
        title="Select Trip for Expense"
        maxWidth="sm"
      >
        <div className="divide-y divide-white/15 max-h-64 overflow-y-auto -mx-2 px-2">
          {activeTrips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => {
                setIsTripPickerOpen(false);
                navigate(`/trips/${trip.id}?action=add-expense`);
              }}
              className="w-full text-left py-3 px-3 flex items-center justify-between hover:bg-white/15 rounded-xl transition-all cursor-pointer"
            >
              <span className="text-sm font-semibold text-white truncate drop-shadow-xs">
                {trip.name}
              </span>
              <span className="text-xs text-white/75 shrink-0 ml-2 bg-white/15 px-2 py-0.5 rounded-full">
                {trip.members_count || 1} {trip.members_count === 1 ? 'member' : 'members'}
              </span>
            </button>
          ))}
        </div>
      </GlassModal>

      {/* --- No Active Trips Modal (GlassModal) --- */}
      <GlassModal
        isOpen={isNoTripsSheetOpen}
        onClose={() => setIsNoTripsSheetOpen(false)}
        title="Create a Trip First"
        maxWidth="sm"
      >
        <p className="text-sm text-white/80 leading-relaxed mb-5">
          You need an active trip before adding and splitting expenses.
        </p>

        <div className="flex justify-end gap-2.5">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setIsNoTripsSheetOpen(false)}
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => {
              setIsNoTripsSheetOpen(false);
              navigate('/trips/new');
            }}
          >
            Create Trip
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default AppLayout;
