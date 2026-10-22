import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  Receipt,
  Scale,
  Bell,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  MapPin,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Logo } from '@/components/brand/Logo';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Trips & Rides', path: '/trips', icon: Compass },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-200 p-5 justify-between select-none">
        <div>
          {/* Brand Header */}
          <div className="pb-6 border-b border-slate-800/80 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <Logo size="md" showTagline={true} theme="dark" />
          </div>

          {/* Quick Action Button */}
          <div className="mt-6 mb-4">
            <button
              onClick={() => navigate('/trips/new')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              <span>New Ride / Trip</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- Mobile Top Header --- */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div onClick={() => navigate('/dashboard')} className="cursor-pointer">
          <Logo size="sm" showTagline={false} theme="dark" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* --- Mobile Drawer Menu --- */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 text-white p-6 rounded-t-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <Logo size="sm" showTagline={true} theme="dark" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/trips/new');
              }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Trip</span>
            </button>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium ${
                        isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{user?.full_name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2 px-1 text-slate-500 shadow-lg">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/trips"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
            }`
          }
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span>Trips</span>
        </NavLink>

        {/* Center Quick Action button */}
        <button
          onClick={() => navigate('/trips/new')}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 active:scale-95 transition-transform"
          aria-label="New Trip"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
            }`
          }
        >
          <Bell className="w-5 h-5 mb-0.5" />
          <span>Alerts</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
};
