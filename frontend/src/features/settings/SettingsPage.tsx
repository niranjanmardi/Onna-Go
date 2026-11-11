import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  LogOut,
  Camera,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Trash2,
  Download,
  Palette,
  X,
  Sparkles,
  ShieldCheck,
  Check,
  Users,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useOffline } from '@/context/OfflineContext';
import { getAvatarUrl, api } from '@/lib/api-client';
import { downloadHistoryCsv } from '@/lib/export-utils';
import { ThemeGalleryModal } from '@/components/themes/ThemeGalleryModal';
import { UserAvatar } from '@/components/common/UserAvatar';
import {
  getSoundPreferences,
  setSoundPreferences,
  SoundPreferences,
  playSound,
} from '@/lib/sounds';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateProfile, changePassword, deleteAccount, uploadAvatar } = useAuth();
  const { theme, setTheme, activeThemeId, activeTheme } = useTheme();
  const { syncNow, isSyncing, pendingCount, lastSyncedAt } = useOffline();
  const navigate = useNavigate();

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isThemesGalleryOpen, setIsThemesGalleryOpen] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editCurrency, setEditCurrency] = useState('INR');
  const [editUpi, setEditUpi] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Clear data state
  const [clearingData, setClearingData] = useState(false);
  const [clearDataSuccess, setClearDataSuccess] = useState<string | null>(null);

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sound effects state & preferences
  const [soundPrefs, setSoundPrefs] = useState<SoundPreferences>(() => getSoundPreferences());

  useEffect(() => {
    const handlePrefChange = () => {
      setSoundPrefs(getSoundPreferences());
    };
    window.addEventListener('onnago_sound_preference_changed', handlePrefChange);
    return () => window.removeEventListener('onnago_sound_preference_changed', handlePrefChange);
  }, []);

  const handleToggleMaster = () => {
    const next = !soundPrefs.master;
    const updated = setSoundPreferences({ master: next });
    setSoundPrefs(updated);
    if (next) {
      playSound('click');
    }
  };

  const handleToggleCategory = (cat: keyof Omit<SoundPreferences, 'master'>) => {
    const next = !soundPrefs[cat];
    const updated = setSoundPreferences({ [cat]: next });
    setSoundPrefs(updated);
    if (next && soundPrefs.master) {
      playSound('click');
    }
  };

  // Export state
  const [exportingData, setExportingData] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditProfile = () => {
    if (!user) return;
    setEditName(user.full_name || '');
    setEditUsername(user.username || '');
    setEditCurrency(user.default_currency || 'INR');
    setEditUpi(user.upi_id || '');
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!editName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: editName.trim(),
        username: editUsername.trim() || null,
        default_currency: editCurrency,
        upi_id: editUpi.trim() || null,
      });
      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileSuccess(null);
      }, 1200);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleClearOfflineData = async () => {
    setClearingData(true);
    try {
      const dbs = await window.indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name && (db.name.includes('rupaii') || db.name.includes('onnago'))) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
      setClearDataSuccess('Local offline cache cleared.');
      setTimeout(() => {
        setIsClearDataOpen(false);
        setClearDataSuccess(null);
      }, 1500);
    } catch {
      alert('Failed to clear some local storage.');
    } finally {
      setClearingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount(deleteConfirmText);
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      await downloadHistoryCsv();
    } catch (err: any) {
      alert('Failed to export data: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingData(false);
    }
  };

  const formatLastSync = (ts: Date | number | null) => {
    if (!ts) return 'Never';
    const timestamp = ts instanceof Date ? ts.getTime() : ts;
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#16834A] dark:text-[#22C55E]" />
      </div>
    );
  }

  const avatarInitial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-9 pb-24 sm:pb-28 space-y-6 font-['Inter',sans-serif] w-full min-w-0">
      {/* Top Header */}
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white drop-shadow-sm">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium mt-0.5">
            Account credentials, visual appearance &amp; offline storage
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* --- MASTER IPHONE-INSPIRED FROSTED GLASS PANEL --- */}
      {/* ========================================================================= */}
      <div className="glass-panel p-3.5 sm:p-7 space-y-7 rounded-3xl w-full min-w-0">
        {/* ========================================================================= */}
        {/* --- SECTION 1: ACCOUNT --- */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 w-full min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Account Information
            </h2>
            <span className="text-[11px] font-semibold text-[#16834A] dark:text-[#22C55E] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified User
            </span>
          </div>

          <div className="glass-card rounded-2xl p-3.5 sm:p-5 border border-white/40 dark:border-white/10 shadow-sm space-y-1 divide-y divide-black/5 dark:divide-white/10 w-full min-w-0">
            {/* Avatar & Profile Hero Row */}
            <div
              onClick={openEditProfile}
              className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors group w-full min-w-0"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <UserAvatar
                  name={user.full_name}
                  avatarUrl={user.avatar_url}
                  size="lg"
                  shape="rounded-2xl"
                  className="ring-2 ring-white/50 dark:ring-white/15 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-zinc-900 dark:text-white truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#16834A] dark:text-[#22C55E] px-3 py-1.5 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 group-hover:scale-105 transition-all shrink-0">
                <span>Edit</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Name */}
            <div
              onClick={openEditProfile}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                Full Name
              </span>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0 w-full sm:w-auto">
                <span className="text-sm font-bold text-zinc-900 dark:text-white break-words sm:text-right">
                  {user.full_name}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              </div>
            </div>

            {/* Email */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-2 w-full min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                Email Address
              </span>
              <span className="text-sm font-medium text-zinc-900 dark:text-white font-mono break-all sm:text-right">
                {user.email}
              </span>
            </div>

            {/* Username */}
            <div
              onClick={openEditProfile}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                Username Handle
              </span>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0 w-full sm:w-auto">
                <span className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 font-mono text-xs font-semibold text-zinc-900 dark:text-white break-all">
                  {user.username ? `@${user.username}` : 'Not set'}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              </div>
            </div>

            {/* Default Currency */}
            <div
              onClick={openEditProfile}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                Default Currency
              </span>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0 w-full sm:w-auto">
                <span className="font-mono px-2.5 py-1 rounded-md bg-[#16834A]/10 text-[#16834A] dark:bg-[#22C55E]/15 dark:text-[#22C55E] text-xs font-bold">
                  {user.default_currency || 'INR'} (₹)
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              </div>
            </div>

            {/* Change Password */}
            <div
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError(null);
                setPasswordSuccess(null);
                setIsChangePasswordOpen(true);
              }}
              className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">Change Password</span>
              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            </div>

            {/* Sign Out */}
            <div
              onClick={logout}
              className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-red-500/10 rounded-xl px-2 transition-colors text-red-600 dark:text-red-400 w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-bold">Sign Out of Account</span>
              <LogOut className="w-4 h-4 shrink-0" />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION: TRAVEL MOMENTS & MEMORIES --- */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 w-full min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Travel Moments &amp; Social
            </h2>
            <span className="text-[11px] font-semibold text-[#16834A] dark:text-[#22C55E] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Social Feed
            </span>
          </div>

          <div className="glass-card rounded-2xl p-3.5 sm:p-5 border border-white/40 dark:border-white/10 shadow-sm space-y-1 divide-y divide-black/5 dark:divide-white/10 w-full min-w-0">
            {/* Friends & Travel Partners */}
            <div
              onClick={() => navigate('/friends')}
              className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors group w-full min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block group-hover:text-blue-400 transition-colors truncate">
                    Friends &amp; Connections
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    Manage friends, pending requests, and travel connections
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            <div
              onClick={() => navigate('/feed?filter=mine')}
              className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors group w-full min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block group-hover:text-purple-400 transition-colors truncate">
                    My Travel Memories
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    View and manage all personal trip snapshots and posts
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            <div
              onClick={() => navigate('/feed')}
              className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors group w-full min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block group-hover:text-emerald-400 transition-colors truncate">
                    Explore Social Feed
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    Moments shared by friends and across your adventures
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION 2: APP APPEARANCE & ARTISTIC THEMES --- */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 w-full min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              App Appearance
            </h2>
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              13 Impressionist Travel Artworks
            </span>
          </div>

          <div className="glass-card rounded-2xl p-3.5 sm:p-5 border border-white/40 dark:border-white/10 shadow-sm space-y-4 w-full min-w-0">
            {/* Unified iPhone Frosted Glass System */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/10 w-full min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Design Language</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-1">Apple iOS Frosted Glass &amp; Static Travel Artworks</p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs font-bold text-emerald-400 shadow-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Glass</span>
              </div>
            </div>

            {/* Active Wallpaper Preview & Gallery Trigger */}
            <div
              onClick={() => setIsThemesGalleryOpen(true)}
              className="p-3.5 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/70 dark:hover:bg-white/5 transition-all shadow-xs group w-full min-w-0"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-black/10 dark:border-white/10 shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  {activeTheme?.thumbnail_url ? (
                    <img
                      src={activeTheme.thumbnail_url}
                      alt={activeTheme.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Palette className="w-6 h-6 text-[#16834A] dark:text-[#22C55E] m-auto" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                      {activeTheme?.name || 'Howrah Bridge — Golden Sunset'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#16834A] text-white flex items-center gap-1 shadow-xs shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate mt-0.5">
                    {activeTheme?.category_label ? `${activeTheme.category_label} • Impressionist Oil Artwork` : '13 impressionist travel wallpapers available'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#1ea951] text-white dark:text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Browse Themes
                </button>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION 3: NOTIFICATIONS & SOUNDS --- */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 w-full min-w-0">
          <div className="px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Preferences &amp; Sounds
            </h2>
          </div>

          <div className="glass-card rounded-2xl p-3.5 sm:p-5 border border-white/40 dark:border-white/10 shadow-sm space-y-1 divide-y divide-black/5 dark:divide-white/10 w-full min-w-0">
            {/* Trip Activity */}
            <div className="py-3.5 flex items-center justify-between gap-3 px-2 w-full min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Trip Activity Alerts</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium line-clamp-1">Instant alerts on new splits and settlements</p>
              </div>
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 shrink-0">
                Included
              </span>
            </div>

            {/* Master Audio Feedback */}
            <div className="py-3.5 flex items-center justify-between gap-3 px-2 w-full min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Master Audio Feedback</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium line-clamp-1">Original synthesized audio cues across all interactions</p>
              </div>
              <button
                type="button"
                aria-label="Toggle master audio feedback"
                onClick={handleToggleMaster}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer shadow-inner shrink-0 ${
                  soundPrefs.master ? 'bg-[#16834A] dark:bg-[#22C55E]' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    soundPrefs.master ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Granular Sound Preferences (visible when master audio is active) */}
            {soundPrefs.master && (
              <div className="pt-2 pb-1 space-y-3.5 pl-3 sm:pl-4 border-l-2 border-emerald-500/30 dark:border-emerald-400/30 my-2 w-full min-w-0">
                {/* Expense & Settlement Sounds */}
                <div className="flex items-center justify-between gap-3 w-full min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Expense &amp; Settlement Sounds</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">Confirmation chimes upon adding expenses and recording settlements</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle expense success sound"
                    onClick={() => handleToggleCategory('expense')}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      soundPrefs.expense ? 'bg-[#16834A] dark:bg-[#22C55E]' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                        soundPrefs.expense ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Trip Sounds */}
                <div className="flex items-center justify-between gap-3 w-full min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Trip Sounds</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">Celebration chimes when creating, joining, or completing trips</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle trip sound"
                    onClick={() => handleToggleCategory('trip')}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      soundPrefs.trip ? 'bg-[#16834A] dark:bg-[#22C55E]' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                        soundPrefs.trip ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Notification Sounds */}
                <div className="flex items-center justify-between gap-3 w-full min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Notification Sounds</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">Subtle chimes on incoming friend requests and trip updates</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle notification sound"
                    onClick={() => handleToggleCategory('notification')}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      soundPrefs.notification ? 'bg-[#16834A] dark:bg-[#22C55E]' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                        soundPrefs.notification ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Interaction Sounds */}
                <div className="flex items-center justify-between gap-3 w-full min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Interaction Micro-Cues</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">Soft tactile clicks on buttons, tabs, and theme switches</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle interaction sound"
                    onClick={() => handleToggleCategory('interaction')}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      soundPrefs.interaction ? 'bg-[#16834A] dark:bg-[#22C55E]' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                        soundPrefs.interaction ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION 4: DATA & OFFLINE CACHE --- */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 w-full min-w-0">
          <div className="px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Data &amp; Offline Sync
            </h2>
          </div>

          <div className="glass-card rounded-2xl p-3.5 sm:p-5 border border-white/40 dark:border-white/10 shadow-sm space-y-1 divide-y divide-black/5 dark:divide-white/10 w-full min-w-0">
            {/* Offline Data Status */}
            <div className="py-3.5 flex items-center justify-between gap-3 px-2 w-full min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Offline Sync Status</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">
                  {pendingCount} pending mutations &bull; Last sync: {formatLastSync(lastSyncedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-[#16834A]/10 text-[#16834A] dark:bg-[#22C55E]/15 dark:text-[#22C55E] text-xs font-bold hover:bg-[#16834A]/20 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {/* Clear Offline Data */}
            <div className="py-3.5 flex items-center justify-between gap-3 px-2 w-full min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Clear Offline Cache</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium line-clamp-1">Reset local IndexedDB cache safely</p>
              </div>
              <button
                type="button"
                onClick={() => setIsClearDataOpen(true)}
                className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
              >
                Clear
              </button>
            </div>

            {/* Export My Data */}
            <div className="py-3.5 flex items-center justify-between gap-3 px-2 w-full min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Export Ledger History</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium line-clamp-1">Download complete expense history as CSV</p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                disabled={exportingData}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16834A] dark:text-[#22C55E] px-3.5 py-1.5 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 hover:bg-[#16834A]/20 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {exportingData ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION 5: ABOUT & LEGAL --- */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 w-full min-w-0">
          <div className="px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              About &amp; Legal
            </h2>
          </div>

          <div className="glass-card rounded-2xl p-3.5 sm:p-5 border border-white/40 dark:border-white/10 shadow-sm space-y-1 divide-y divide-black/5 dark:divide-white/10 w-full min-w-0">
            {/* Version */}
            <div className="py-3.5 flex items-center justify-between gap-3 px-2 w-full min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">App Version</span>
              <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
                v1.0.0 (Production)
              </span>
            </div>

            {/* Android App Download */}
            <div
              onClick={() => navigate('/download')}
              className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">Android Application</span>
                <span className="text-[10px] font-bold bg-[#16834A]/15 text-[#16834A] dark:text-[#22C55E] px-2 py-0.5 rounded-full shrink-0">
                  APK Available
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            </div>

            {/* Privacy Policy */}
            <div
              onClick={() => setIsPrivacyOpen(true)}
              className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            </div>

            {/* Terms of Service */}
            <div
              onClick={() => setIsTermsOpen(true)}
              className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-xl px-2 transition-colors w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">Terms of Service</span>
              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            </div>

            {/* Delete Account */}
            <div
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteError(null);
                setIsDeleteAccountOpen(true);
              }}
              className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-500/10 rounded-xl px-2 transition-colors text-red-600 dark:text-red-400 w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-bold">Permanently Delete Account</span>
              <Trash2 className="w-4 h-4 shrink-0" />
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* --- MODAL 1: EDIT PROFILE --- */}
      {/* ========================================================================= */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-solid max-w-md w-full p-6 sm:p-7 space-y-5 rounded-3xl border border-white/50 dark:border-white/15 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {uploadingAvatar ? (
                  <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center ring-4 ring-white/30 dark:ring-white/15">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                ) : (
                  <UserAvatar
                    name={editName || user.full_name}
                    avatarUrl={user.avatar_url}
                    size="xl"
                    shape="rounded-2xl"
                    className="ring-4 ring-white/30 dark:ring-white/15 shadow-lg"
                  />
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Change photo</span>
                </button>
              </div>
            </div>

            {profileError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 font-medium">
                {profileError}
              </p>
            )}

            {profileSuccess && (
              <p className="text-xs text-[#16834A] dark:text-[#22C55E] bg-[#16834A]/10 p-3 rounded-xl border border-[#16834A]/20 font-medium">
                {profileSuccess}
              </p>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. rahul_ride"
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Default Currency
                </label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="glass-input w-full text-sm [&>option]:bg-zinc-900 [&>option]:text-white"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={editUpi}
                  onChange={(e) => setEditUpi(e.target.value)}
                  placeholder="name@upi / 9876543210@paytm"
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full h-11 bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-zinc-950 font-bold text-sm rounded-xl hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-md"
                >
                  {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 2: CHANGE PASSWORD --- */}
      {/* ========================================================================= */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-solid max-w-md w-full p-6 sm:p-7 space-y-5 rounded-3xl border border-white/50 dark:border-white/15 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Change Password</h3>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 font-medium">
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p className="text-xs text-[#16834A] dark:text-[#22C55E] bg-[#16834A]/10 p-3 rounded-xl border border-[#16834A]/20 font-medium">
                {passwordSuccess}
              </p>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="glass-input w-full pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input w-full pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full h-11 bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-zinc-950 font-bold text-sm rounded-xl hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-md"
                >
                  {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 3: CLEAR OFFLINE DATA --- */}
      {/* ========================================================================= */}
      {isClearDataOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-solid max-w-sm w-full p-6 space-y-4 rounded-3xl border border-white/50 dark:border-white/15 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Clear Offline Data?</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
              Any unsynced offline changes will be permanently lost. Are you sure you want to clear the local database?
            </p>

            {clearDataSuccess && (
              <p className="text-xs text-[#16834A] dark:text-[#22C55E] bg-[#16834A]/10 p-2.5 rounded-xl font-medium">
                {clearDataSuccess}
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsClearDataOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearOfflineData}
                disabled={clearingData}
                className="flex-1 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center shadow-md"
              >
                {clearingData ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 4: DELETE ACCOUNT --- */}
      {/* ========================================================================= */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-solid max-w-sm w-full p-6 space-y-4 rounded-3xl border border-red-500/30 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold">Delete Account</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
              This action is permanent and cannot be undone. All your trips, expense shares, and balances will be removed.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-11 px-3 bg-white/80 dark:bg-zinc-900/80 border border-red-300 dark:border-red-900 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-red-500 text-zinc-900 dark:text-white"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{deleteError}</p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center justify-center shadow-md"
              >
                {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 5: PRIVACY POLICY --- */}
      {/* ========================================================================= */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-solid max-w-lg w-full p-6 sm:p-7 space-y-4 rounded-3xl border border-white/50 dark:border-white/15 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Privacy Policy</h3>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-3 leading-relaxed font-medium">
              <p>
                <strong>Data Minimization:</strong> ONNA-GO collects only the data necessary to coordinate group trips and accurately simplify peer-to-peer debts (name, email, default currency, and trip expenses).
              </p>
              <p>
                <strong>Offline Storage:</strong> Your pending expenses and cached trips are stored locally on your device in IndexedDB. Offline data is never shared with third parties and is cleared automatically upon sign-out.
              </p>
              <p>
                <strong>Account Deletion &amp; Ledger Integrity:</strong> When you delete your account, your profile is permanently deactivated and your email and username are anonymized. However, shared trip expense records and split allocations are preserved so that remaining trip members retain complete, accurate ledgers and zero-sum balance invariants.
              </p>
              <p>
                <strong>Encryption &amp; Security:</strong> All API communication takes place over HTTPS. Session tokens are stored securely in local browser storage and cookie credentials.
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 6: TERMS OF SERVICE --- */}
      {/* ========================================================================= */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-solid max-w-lg w-full p-6 sm:p-7 space-y-4 rounded-3xl border border-white/50 dark:border-white/15 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Terms of Service</h3>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-3 leading-relaxed font-medium">
              <p>
                <strong>Service Usage:</strong> ONNA-GO is a collaborative group trip expense management application designed to track shared costs and simplify debt repayments.
              </p>
              <p>
                <strong>Financial Disclaimer:</strong> ONNA-GO provides mathematical debt simplification based on user inputs. ONNA-GO does not process bank transactions directly; actual settlement transfers are completed via UPI or external payment rails.
              </p>
              <p>
                <strong>Account Responsibility:</strong> You are responsible for keeping your login credentials confidential and for all activities recorded under your account.
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 7: 5 ARTISTIC TRAVEL WALLPAPERS GALLERY --- */}
      <ThemeGalleryModal
        isOpen={isThemesGalleryOpen}
        onClose={() => setIsThemesGalleryOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
