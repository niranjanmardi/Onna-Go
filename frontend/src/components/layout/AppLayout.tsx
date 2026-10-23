import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  Bell,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  Users,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { getAvatarUrl } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount, playClick } = useFeedback();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Trips & Rides', path: '/trips', icon: Compass },
    { label: 'Friends', path: '/friends', icon: Users },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Profile & Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col md:flex-row text-[#171717]">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex flex-col w-64 bg-[#FAFAF8] border-r border-[#E8E8E5] p-5 justify-between select-none">
        <div>
          {/* Brand Header */}
          <div
            className="pb-6 border-b border-[#E8E8E5] cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <Logo size="md" showTagline={true} theme="light" />
          </div>

          {/* Quick Action Button */}
          <div className="mt-5 mb-4">
            <button
              onClick={() => navigate('/trips/new')}
              className="w-full flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Trip</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isNotif = item.path === '/notifications';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={playClick}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white text-[#171717] shadow-xs border border-[#E8E8E5] font-semibold'
                        : 'text-[#737373] hover:text-[#171717] hover:bg-[#F4F4F2]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isNotif && unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#2563EB] text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-4 border-t border-[#E8E8E5]">
          <div
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#F4F4F2] cursor-pointer transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0 border border-[#E8E8E5]">
              {user?.avatar_url ? (
                <img
                  src={getAvatarUrl(user.avatar_url)}
                  alt={user.full_name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.full_name ? user.full_name[0].toUpperCase() : 'U'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#171717] truncate">{user?.full_name}</p>
              <p className="text-xs text-[#737373] truncate">@{user?.username || 'user'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#737373] hover:text-[#E11D48] hover:bg-[#FFE4E6]/50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- Mobile Top Header --- */}
      <header className="md:hidden sticky top-0 z-40 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E8E8E5] px-4 py-3 flex items-center justify-between">
        <div onClick={() => navigate('/dashboard')} className="cursor-pointer">
          <Logo size="sm" showTagline={false} theme="light" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClick();
              navigate('/notifications');
            }}
            className="p-2 text-[#737373] hover:text-[#171717] rounded-lg transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-2 ring-white" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#737373] hover:text-[#171717] rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* --- Mobile Drawer Menu --- */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-[#FAFAF8] text-[#171717] p-6 rounded-t-2xl space-y-4 max-h-[85vh] overflow-y-auto border-t border-[#E8E8E5] shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
              <Logo size="sm" showTagline={true} theme="light" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#737373] hover:text-[#171717] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => {
                playClick();
                setMobileMenuOpen(false);
                navigate('/trips/new');
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#16834A] text-white py-3 rounded-xl font-semibold shadow-xs cursor-pointer active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Trip</span>
            </button>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isNotif = item.path === '/notifications';
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      playClick();
                      setMobileMenuOpen(false);
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-white text-[#171717] border border-[#E8E8E5] font-semibold'
                          : 'text-[#737373] hover:bg-[#F4F4F2]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isNotif && unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#2563EB] text-white">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#E8E8E5] flex items-center justify-between">
              <div
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/settings');
                }}
                className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 mr-2"
              >
                <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0 border border-[#E8E8E5]">
                  {user?.avatar_url ? (
                    <img
                      src={getAvatarUrl(user.avatar_url)}
                      alt={user.full_name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user?.full_name ? user.full_name[0].toUpperCase() : 'U'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.full_name}</p>
                  <p className="text-xs text-[#737373] truncate">@{user?.username || 'user'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#E11D48] bg-[#FFE4E6] rounded-lg font-medium flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* --- Mobile Bottom Tab Bar --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-t border-[#E8E8E5] flex items-center justify-around py-2 px-1 text-[#737373] shadow-xs">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#16834A] font-bold' : 'hover:text-[#171717]'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/trips"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#16834A] font-bold' : 'hover:text-[#171717]'
            }`
          }
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span>Trips</span>
        </NavLink>

        {/* Center Quick Action button */}
        <button
          onClick={() => navigate('/trips/new')}
          className="-mt-5 w-11 h-11 rounded-full bg-[#16834A] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="New Trip"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <NavLink
          to="/friends"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#16834A] font-bold' : 'hover:text-[#171717]'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Friends</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#16834A] font-bold' : 'hover:text-[#171717]'
            }`
          }
        >
          <UserIcon className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
};
