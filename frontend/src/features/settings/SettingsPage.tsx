import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  LogOut,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertTriangle,
  Download,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useOffline } from '@/context/OfflineContext';
import { useFeedback } from '@/context/FeedbackContext';
import { clearAllOfflineData } from '@/lib/offline-db';
import { downloadHistoryCsv } from '@/lib/export-utils';
import { getAvatarUrl } from '@/lib/api-client';

export const SettingsPage: React.FC = () => {
  const { user, isLoading, logout, updateProfile, changePassword, uploadAvatar, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pendingCount, lastSyncedAt, isSyncing, syncNow } = useOffline();
  const { soundsEnabled, setSoundsEnabled } = useFeedback();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal / Sheet States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editCurrency, setEditCurrency] = useState('INR');
  const [editUpi, setEditUpi] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Clear Offline Data State
  const [clearingData, setClearingData] = useState(false);
  const [clearDataSuccess, setClearDataSuccess] = useState<string | null>(null);

  // Delete Account State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Export State
  const [exportingData, setExportingData] = useState(false);

  const openEditProfile = () => {
    setEditName(user?.full_name || '');
    setEditUsername(user?.username || '');
    setEditCurrency(user?.default_currency || 'INR');
    setEditUpi(user?.upi_id || '');
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setProfileError('Name is required.');
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      await updateProfile({
        full_name: editName.trim(),
        username: editUsername.trim() || undefined,
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
      await clearAllOfflineData();
      setClearDataSuccess('Offline data cleared.');
      setTimeout(() => {
        setIsClearDataOpen(false);
        setClearDataSuccess(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to clear offline data');
    } finally {
      setClearingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.');
      return;
    }
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount('DELETE');
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      await downloadHistoryCsv();
    } catch (err: any) {
      alert(err.message || 'Failed to export data');
    } finally {
      setExportingData(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- SKELETON LOADER ---
  if (isLoading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-8 animate-pulse">
        <div className="h-6 w-28 bg-[#E8E8E5] dark:bg-[#262626] rounded-md" />
        {[1, 2, 3, 4, 5].map((sec) => (
          <div key={sec} className="space-y-3">
            <div className="h-3 w-20 bg-[#E8E8E5] dark:bg-[#262626] rounded-sm" />
            <div className="space-y-0 divide-y divide-[#E8E8E5] dark:divide-[#262626]">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-14 flex items-center justify-between">
                  <div className="h-4 w-28 bg-[#E8E8E5] dark:bg-[#262626] rounded-md" />
                  <div className="h-4 w-20 bg-[#E8E8E5] dark:bg-[#262626] rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const avatarInitial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-9 text-[#171717] dark:text-[#EDEDED] font-['Inter',sans-serif]">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      {/* ========================================================================= */}
      {/* --- SECTION 1: ACCOUNT --- */}
      {/* ========================================================================= */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] pb-1">
          Account
        </h2>

        <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
          {/* Avatar & Profile Row */}
          <div
            onClick={openEditProfile}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#16834A] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={getAvatarUrl(user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-sm font-medium truncate">{user.full_name}</p>
                <p className="text-xs text-[#737373] dark:text-[#8E8E93] truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#8E8E93]">
              <span>Edit</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Name */}
          <div
            onClick={openEditProfile}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Name</span>
            <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#8E8E93]">
              <span className="truncate max-w-[180px]">{user.full_name}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Email */}
          <div className="h-14 flex items-center justify-between">
            <span className="text-sm font-medium">Email</span>
            <span className="text-xs text-[#737373] dark:text-[#8E8E93] truncate max-w-[200px]">
              {user.email}
            </span>
          </div>

          {/* Username */}
          <div
            onClick={openEditProfile}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Username</span>
            <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#8E8E93]">
              <span>{user.username ? `@${user.username}` : 'Not set'}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Default Currency */}
          <div
            onClick={openEditProfile}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Default currency</span>
            <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#8E8E93]">
              <span className="font-mono font-medium">{user.default_currency || 'INR'}</span>
              <ChevronRight className="w-4 h-4" />
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
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Change password</span>
            <ChevronRight className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
          </div>

          {/* Sign Out */}
          <div
            onClick={logout}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity text-[#171717] dark:text-[#EDEDED]"
          >
            <span className="text-sm font-medium">Sign out</span>
            <LogOut className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* --- SECTION 2: APPEARANCE --- */}
      {/* ========================================================================= */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] pb-1">
          Appearance
        </h2>

        <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
          <div className="h-14 flex items-center justify-between">
            <span className="text-sm font-medium">Theme</span>
            <div className="flex bg-[#F4F4F2] dark:bg-[#1C1C1C] p-1 rounded-xl border border-[#E8E8E5] dark:border-[#2E2E2E]">
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-white dark:bg-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] shadow-xs'
                    : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED]'
                }`}
              >
                System
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white dark:bg-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] shadow-xs'
                    : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED]'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] shadow-xs'
                    : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED]'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* --- SECTION 3: NOTIFICATIONS --- */}
      {/* ========================================================================= */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] pb-1">
          Notifications
        </h2>

        <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
          {/* Trip Activity */}
          <div className="h-14 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Trip activity alerts</p>
              <p className="text-xs text-[#737373] dark:text-[#8E8E93]">New expenses, splits, and settlements</p>
            </div>
            <span className="text-xs text-[#737373] dark:text-[#8E8E93] px-2 py-0.5 rounded-md bg-[#F4F4F2] dark:bg-[#1C1C1C] border border-[#E8E8E5] dark:border-[#2E2E2E]">
              Coming soon
            </span>
          </div>

          {/* Settlement Reminders */}
          <div className="h-14 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Settlement reminders</p>
              <p className="text-xs text-[#737373] dark:text-[#8E8E93]">Reminders for outstanding balances</p>
            </div>
            <span className="text-xs text-[#737373] dark:text-[#8E8E93] px-2 py-0.5 rounded-md bg-[#F4F4F2] dark:bg-[#1C1C1C] border border-[#E8E8E5] dark:border-[#2E2E2E]">
              Coming soon
            </span>
          </div>

          {/* In-app sound effects */}
          <div className="h-14 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sound effects</p>
              <p className="text-xs text-[#737373] dark:text-[#8E8E93]">Subtle audio cues on split and sync</p>
            </div>
            <button
              type="button"
              onClick={() => setSoundsEnabled(!soundsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                soundsEnabled ? 'bg-[#16834A] dark:bg-[#22C55E]' : 'bg-[#E8E8E5] dark:bg-[#333333]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  soundsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* --- SECTION 4: DATA --- */}
      {/* ========================================================================= */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] pb-1">
          Data
        </h2>

        <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
          {/* Offline Data Status */}
          <div className="h-14 flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="text-sm font-medium">Offline data</p>
              <p className="text-xs text-[#737373] dark:text-[#8E8E93] truncate">
                {pendingCount} pending changes &bull; Last sync: {formatLastSync(lastSyncedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="text-xs font-semibold text-[#16834A] dark:text-[#22C55E] hover:underline cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSyncing ? 'Syncing...' : 'Sync now'}
            </button>
          </div>

          {/* Clear Offline Data */}
          <div className="h-14 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear offline data</p>
              <p className="text-xs text-[#737373] dark:text-[#8E8E93]">Reset local cache and outbox store</p>
            </div>
            <button
              type="button"
              onClick={() => setIsClearDataOpen(true)}
              className="text-xs font-semibold text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Export My Data */}
          <div className="h-14 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-[#737373] dark:text-[#8E8E93]">Download complete trip history as CSV</p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportingData}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834A] dark:text-[#22C55E] hover:underline cursor-pointer disabled:opacity-50"
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
      {/* --- SECTION 5: ABOUT --- */}
      {/* ========================================================================= */}
      <section className="space-y-1 pb-16">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] pb-1">
          About
        </h2>

        <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
          {/* Version */}
          <div className="h-14 flex items-center justify-between">
            <span className="text-sm font-medium">Version</span>
            <span className="text-xs font-mono text-[#737373] dark:text-[#8E8E93]">v1.0.0 (Production)</span>
          </div>

          {/* Privacy Policy */}
          <div
            onClick={() => setIsPrivacyOpen(true)}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Privacy policy</span>
            <ChevronRight className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
          </div>

          {/* Terms of Service */}
          <div
            onClick={() => setIsTermsOpen(true)}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Terms of service</span>
            <ChevronRight className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
          </div>

          {/* Delete Account */}
          <div
            onClick={() => {
              setDeleteConfirmText('');
              setDeleteError(null);
              setIsDeleteAccountOpen(true);
            }}
            className="h-14 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium text-[#E11D48] dark:text-[#F43F5E]">Delete account</span>
            <Trash2 className="w-4 h-4 text-[#E11D48] dark:text-[#F43F5E]" />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* --- MODAL 1: EDIT PROFILE (BOTTOM SHEET ON MOBILE) --- */}
      {/* ========================================================================= */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 bg-[#E8E8E5] dark:bg-[#333333] rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-lg text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full bg-[#16834A] text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : user.avatar_url ? (
                  <img src={getAvatarUrl(user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-xl text-xs font-semibold hover:bg-[#F4F4F2] dark:hover:bg-[#1C1C1C] cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Change photo</span>
                </button>
              </div>
            </div>

            {profileError && (
              <p className="text-xs text-[#E11D48] dark:text-[#F43F5E] bg-[#FFE4E6] dark:bg-[#3F1118] p-2.5 rounded-lg border border-[#FDA4AF] dark:border-[#9F1239]">
                {profileError}
              </p>
            )}

            {profileSuccess && (
              <p className="text-xs text-[#16834A] dark:text-[#22C55E] bg-[#DDF5E5] dark:bg-[#0E331E] p-2.5 rounded-lg border border-[#C6ECCF] dark:border-[#166534]">
                {profileSuccess}
              </p>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-12 px-3.5 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. rahul_ride"
                  className="w-full h-12 px-3.5 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                />
              </div>

              {/* Default Currency */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  Default Currency
                </label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full h-12 px-3.5 bg-white dark:bg-[#141414] border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              {/* UPI ID */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={editUpi}
                  onChange={(e) => setEditUpi(e.target.value)}
                  placeholder="name@upi / 9876543210@paytm"
                  className="w-full h-12 px-3.5 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full h-12 bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="sm:hidden w-12 h-1 bg-[#E8E8E5] dark:bg-[#333333] rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold">Change Password</h3>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="p-1 rounded-lg text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <p className="text-xs text-[#E11D48] dark:text-[#F43F5E] bg-[#FFE4E6] dark:bg-[#3F1118] p-2.5 rounded-lg border border-[#FDA4AF] dark:border-[#9F1239]">
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p className="text-xs text-[#16834A] dark:text-[#22C55E] bg-[#DDF5E5] dark:bg-[#0E331E] p-2.5 rounded-lg border border-[#C6ECCF] dark:border-[#166534]">
                {passwordSuccess}
              </p>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-12 px-3.5 pr-10 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED]"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-3.5 pr-10 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED]"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 px-3.5 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-[10px] text-sm focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E]"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full h-12 bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 3: CLEAR OFFLINE DATA CONFIRMATION --- */}
      {/* ========================================================================= */}
      {isClearDataOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-[#B45309] dark:text-[#FBBF24]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#EDEDED]">Clear Offline Data?</h3>
            </div>
            <p className="text-xs text-[#737373] dark:text-[#8E8E93] leading-relaxed">
              Any unsynced offline changes will be permanently lost. Are you sure you want to clear the local database?
            </p>

            {clearDataSuccess && (
              <p className="text-xs text-[#16834A] dark:text-[#22C55E] bg-[#DDF5E5] dark:bg-[#0E331E] p-2 rounded-lg">
                {clearDataSuccess}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearDataOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#1C1C1C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearOfflineData}
                disabled={clearingData}
                className="flex-1 py-2.5 text-xs font-semibold bg-[#171717] dark:bg-[#EDEDED] text-white dark:text-[#0A0A0A] rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center"
              >
                {clearingData ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL 4: DELETE ACCOUNT CONFIRMATION --- */}
      {/* ========================================================================= */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-[#E11D48] dark:text-[#F43F5E]">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold">Delete Account</h3>
            </div>
            <p className="text-xs text-[#737373] dark:text-[#8E8E93] leading-relaxed">
              This action is permanent and cannot be undone. All your trips, expense shares, and balances will be removed.
            </p>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-[#737373] dark:text-[#8E8E93]">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-10 px-3 bg-transparent border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-[#E11D48] dark:text-[#F43F5E]">{deleteError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#1C1C1C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-2.5 text-xs font-semibold bg-[#E11D48] text-white rounded-xl hover:bg-[#BE123C] disabled:opacity-50 cursor-pointer flex items-center justify-center"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold">Privacy Policy</h3>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="p-1 rounded-lg text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-[#737373] dark:text-[#8E8E93] space-y-3 leading-relaxed">
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
                className="px-4 py-2 bg-[#171717] dark:bg-[#EDEDED] text-white dark:text-[#0A0A0A] rounded-xl text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold">Terms of Service</h3>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="p-1 rounded-lg text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-[#737373] dark:text-[#8E8E93] space-y-3 leading-relaxed">
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
                className="px-4 py-2 bg-[#171717] dark:bg-[#EDEDED] text-white dark:text-[#0A0A0A] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
