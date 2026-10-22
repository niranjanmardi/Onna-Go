import React, { useState, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  User as UserIcon,
  Mail,
  Coins,
  LogOut,
  Check,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Lock,
  Camera,
  Trash2,
  Bell,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, changePassword, uploadAvatar, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Information State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Avatar State
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Preferences State
  const [defaultCurrency, setDefaultCurrency] = useState(user?.default_currency || 'INR');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    expenseAlerts: true,
    settlementAlerts: true,
    tripInvites: true,
  });

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Format account creation date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await updateProfile({
        full_name: fullName.trim(),
      });
      setProfileSuccess('Personal details updated successfully.');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update personal details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setFullName(user?.full_name || '');
    setIsEditingProfile(false);
    setProfileError(null);
  };

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setAvatarUploading(true);
    setProfileError(null);
    try {
      await uploadAvatar(file);
      setProfileSuccess('Profile picture updated successfully.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to upload profile picture.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle Preferences Save
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaving(true);
    setPrefSuccess(null);
    try {
      await updateProfile({
        default_currency: defaultCurrency,
      });
      setPrefSuccess('Regional and currency preferences saved.');
      setTimeout(() => setPrefSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save preferences.');
    } finally {
      setPrefSaving(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount('DELETE');
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const isGoogleAccount = user?.auth_provider === 'google' || Boolean(user?.google_id);

  return (
    <div className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full space-y-8 selection:bg-[#DDF5E5] selection:text-[#16834A]">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
          Account &amp; Settings
        </h1>
        <p className="text-sm text-[#737373] mt-1">
          Manage your personal profile, regional preferences, and security settings.
        </p>
      </div>

      {/* Global Inline Alerts */}
      {profileSuccess && (
        <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2.5">
          <Check className="w-4 h-4 text-[#16834A]" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#E11D48]" />
          <span>{profileError}</span>
        </div>
      )}

      {/* 1. PERSONAL INFORMATION */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#F4F4F2]">
          <div>
            <h2 className="text-base font-bold text-[#171717]">Personal Information</h2>
            <p className="text-xs text-[#737373] mt-0.5">Your public traveler profile and identity</p>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="text-xs font-semibold text-[#16834A] hover:text-[#136F3F] bg-[#DDF5E5] border border-[#C6ECCF] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Edit Details
            </button>
          )}
        </div>

        {/* Avatar & Badges */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-20 h-20 rounded-2xl object-cover border border-[#E8E8E5] shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#171717] text-white flex items-center justify-center text-xl font-bold font-mono">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Upload profile avatar"
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border border-[#E8E8E5] rounded-lg shadow-xs flex items-center justify-center text-[#737373] hover:text-[#16834A] hover:border-[#16834A] transition-colors cursor-pointer"
            >
              {avatarUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-[#171717]">{user?.full_name}</span>
              {user?.is_verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] px-2 py-0.5 rounded-md border border-[#C6ECCF]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#737373]">{user?.email}</p>
            {memberSince && (
              <p className="text-[11px] text-[#A3A3A3] flex items-center gap-1.5 pt-0.5">
                <Calendar className="w-3 h-3" />
                <span>Member since {memberSince}</span>
              </p>
            )}
          </div>
        </div>

        {/* Editable Form */}
        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div>
              <label htmlFor="edit-name" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#737373] cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-[#A3A3A3] mt-1">
                Your email address is linked to your authentication provider and cannot be modified.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={profileSaving}
                className="px-4 py-2 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {/* 2. PREFERENCES */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="pb-4 border-b border-[#F4F4F2]">
          <h2 className="text-base font-bold text-[#171717]">Preferences</h2>
          <p className="text-xs text-[#737373] mt-0.5">Customize regional currency and alert settings</p>
        </div>

        {prefSuccess && (
          <div className="p-3 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{prefSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSavePreferences} className="space-y-5">
          <div>
            <label htmlFor="currency-select" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
              Default currency
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                <Coins className="w-4 h-4" />
              </div>
              <select
                id="currency-select"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="AED">AED (د.إ) — UAE Dirham</option>
              </select>
            </div>
            <p className="text-[11px] text-[#A3A3A3] mt-1">
              New trips created by you will default to this currency.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Notification preferences
            </label>
            <div className="space-y-2.5 text-xs">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={notifications.expenseAlerts}
                  onChange={(e) => setNotifications({ ...notifications, expenseAlerts: e.target.checked })}
                  className="rounded text-[#16834A] focus:ring-[#16834A] w-4 h-4"
                />
                <div className="flex-1">
                  <span className="font-semibold text-[#171717] block">Expense Activity</span>
                  <span className="text-[#737373] text-[11px]">Notify when a member records or voids an expense</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={notifications.settlementAlerts}
                  onChange={(e) => setNotifications({ ...notifications, settlementAlerts: e.target.checked })}
                  className="rounded text-[#16834A] focus:ring-[#16834A] w-4 h-4"
                />
                <div className="flex-1">
                  <span className="font-semibold text-[#171717] block">Settlement Updates</span>
                  <span className="text-[#737373] text-[11px]">Notify when a payment transfer is recorded or confirmed</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={notifications.tripInvites}
                  onChange={(e) => setNotifications({ ...notifications, tripInvites: e.target.checked })}
                  className="rounded text-[#16834A] focus:ring-[#16834A] w-4 h-4"
                />
                <div className="flex-1">
                  <span className="font-semibold text-[#171717] block">Trip Invitations</span>
                  <span className="text-[#737373] text-[11px]">Notify when you are invited to a new group trip</span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={prefSaving}
              className="px-4 py-2 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {prefSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </section>

      {/* 3. ACCOUNT SECURITY */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="pb-4 border-b border-[#F4F4F2]">
          <h2 className="text-base font-bold text-[#171717]">Security &amp; Authentication</h2>
          <p className="text-xs text-[#737373] mt-0.5">Password management and active sessions</p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-[#16834A]" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E11D48]" />
            <span>{passwordError}</span>
          </div>
        )}

        {/* Auth Provider Status */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8]">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-[#171717] block">Sign-in Method</span>
            <span className="text-xs text-[#737373]">
              {isGoogleAccount ? 'Authenticated with Google OAuth' : 'Standard Email & Password'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-1 rounded-md">
            Active
          </span>
        </div>

        {/* Password Update Form (Available for email accounts) */}
        {!isGoogleAccount && (
          <div>
            {!isChangingPassword ? (
              <button
                type="button"
                onClick={() => setIsChangingPassword(true)}
                className="text-xs font-semibold text-[#171717] hover:text-[#16834A] bg-white border border-[#E8E8E5] px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Change Account Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 p-5 rounded-2xl border border-[#E8E8E5] bg-[#FAFAF8]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Change Password</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError(null);
                    }}
                    className="text-[#737373] hover:text-[#171717] text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#E8E8E5] rounded-xl pl-3.5 pr-10 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#16834A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3]"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-white border border-[#E8E8E5] rounded-xl pl-3.5 pr-10 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#16834A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#16834A]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-4 py-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {passwordSaving ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Active Session & Logout */}
        <div className="pt-4 border-t border-[#F4F4F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#737373]">
            <span className="font-semibold text-[#171717] block">Active Session</span>
            <span>Current browser session active with secure token encryption</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#E11D48] hover:bg-[#FFE4E6] border border-[#FDA4AF] rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {/* 4. DANGER ZONE */}
      <section className="bg-white rounded-2xl border border-[#FDA4AF] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="pb-3 border-b border-[#FFE4E6]">
          <h2 className="text-base font-bold text-[#E11D48]">Danger Zone</h2>
          <p className="text-xs text-[#737373] mt-0.5">
            Irreversible actions regarding your account and access
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-lg">
            <span className="text-xs font-bold text-[#171717] block">Delete ONNA-GO Account</span>
            <p className="text-xs text-[#737373] leading-relaxed">
              Permanently deactivate your login access. Historical trip expenses remain preserved to protect group zero-sum balance integrity for your friends.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] hover:bg-[#BE123C] rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 max-w-md w-full shadow-xl space-y-4 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#171717] p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#171717]">
                Are you absolutely sure?
              </h3>
              <p className="text-xs text-[#737373] mt-1.5 leading-relaxed">
                This action will revoke your account credentials immediately. Type <strong>DELETE</strong> below to confirm.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-[#FFE4E6] text-[#E11D48] text-xs">
                {deleteError}
              </div>
            )}

            <div>
              <label htmlFor="confirm-delete" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Confirmation
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-sm text-[#171717] font-mono focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText.trim() !== 'DELETE' || isDeleting}
                className="px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold rounded-xl disabled:opacity-40 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Account Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
