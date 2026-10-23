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
  Copy,
  CheckCheck,
  MapPin,
  Phone,
  FileText,
  AtSign,
  X,
  Upload,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, changePassword, uploadAvatar, deleteAccount, logout } = useAuth();
  const { showConfirmation, soundsEnabled, setSoundsEnabled } = useFeedback();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Information State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Avatar Upload & Preview State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  // Copy UID State
  const [copiedUid, setCopiedUid] = useState(false);

  // Preferences State
  const [defaultCurrency, setDefaultCurrency] = useState(user?.default_currency || 'INR');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

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

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleCopyUid = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2500);
  };

  // Handle Photo Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setProfileError(null);
  };

  const handleCancelPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;

    setAvatarUploading(true);
    setProfileError(null);
    setAvatarSuccess(null);

    try {
      await uploadAvatar(selectedFile);
      setAvatarSuccess('Profile photo updated successfully!');
      showConfirmation({
        title: 'Profile photo updated',
        message: 'Your new avatar is visible across your trips.',
        sound: 'click',
      });
      handleCancelPhoto();
      setTimeout(() => setAvatarSuccess(null), 4000);
    } catch (err: any) {
      playSound('error');
      setProfileError(err.message || 'Failed to upload profile photo.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setProfileError('Display name cannot be empty.');
      setProfileSaving(false);
      return;
    }

    try {
      await updateProfile({
        full_name: trimmedName,
        bio: bio.trim(),
        city: city.trim(),
        phone_number: phoneNumber.trim(),
      });
      setProfileSuccess('Profile details saved successfully.');
      showConfirmation({
        title: 'Profile details saved',
        message: 'Your personal information was updated successfully.',
        sound: 'click',
      });
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      playSound('error');
      setProfileError(err.message || 'Failed to update personal details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setFullName(user?.full_name || '');
    setBio(user?.bio || '');
    setCity(user?.city || '');
    setPhoneNumber(user?.phone_number || '');
    setIsEditingProfile(false);
    setProfileError(null);
  };

  // Handle Currency Preference Update
  const handleSaveCurrency = async (newCurr: string) => {
    setDefaultCurrency(newCurr);
    setPrefSaving(true);
    setPrefSuccess(null);
    try {
      await updateProfile({ default_currency: newCurr });
      setPrefSuccess('Default currency preference updated.');
      showConfirmation({
        title: 'Currency updated',
        message: `Default currency set to ${newCurr}.`,
        sound: 'click',
      });
      setTimeout(() => setPrefSuccess(null), 3000);
    } catch (err: any) {
      playSound('error');
      setProfileError(err.message || 'Failed to save currency preference.');
    } finally {
      setPrefSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match. Please verify and retry.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully.');
      showConfirmation({
        title: 'Password changed successfully',
        message: 'Your new security credentials are active.',
        sound: 'trip_success',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      playSound('error');
      setPasswordError(err.message || 'Failed to update password. Verify your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      setDeleteError("Please enter 'DELETE' in all capital letters to confirm.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deleteConfirmationText);
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const avatarDisplayUrl = previewUrl || getAvatarUrl(user?.avatar_url);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 selection:bg-[#DDF5E5] selection:text-[#16834A]">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
          Profile &amp; Settings
        </h1>
        <p className="text-sm text-[#737373] mt-1">
          Manage your permanent UID, public profile, and account security.
        </p>
      </div>

      {/* Global Alerts */}
      {avatarSuccess && (
        <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
          <Check className="w-4 h-4 text-[#16834A]" />
          <span>{avatarSuccess}</span>
        </div>
      )}
      {profileSuccess && (
        <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
          <Check className="w-4 h-4 text-[#16834A]" />
          <span>{profileSuccess}</span>
        </div>
      )}
      {profileError && (
        <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-[#E11D48]" />
          <span>{profileError}</span>
        </div>
      )}

      {/* --- 1. PROFILE HEADER CARD --- */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar with Upload Control */}
            <div className="relative group">
              {avatarDisplayUrl ? (
                <img
                  src={avatarDisplayUrl}
                  alt={user?.full_name || 'User avatar'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#E8E8E5] shadow-xs"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#171717] text-white flex items-center justify-center text-xl sm:text-2xl font-bold font-mono">
                  {initials}
                </div>
              )}

              {/* Upload trigger button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                title="Change Photo"
                aria-label="Upload photo"
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border border-[#E8E8E5] rounded-xl shadow-xs flex items-center justify-center text-[#737373] hover:text-[#16834A] hover:border-[#16834A] transition-colors cursor-pointer"
              >
                {avatarUploading ? (
                  <Loader2 className="w-4 h-4 text-[#16834A] animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Profile Info Summary */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
                  {user?.full_name}
                </h2>
                {user?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDF5E5] text-[#16834A]">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>

              {/* Username Handle */}
              <p className="text-sm font-semibold text-[#16834A]">
                @{user?.username || 'user'}
              </p>

              {/* Email (Read-only) */}
              <p className="text-xs text-[#737373] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#A3A3A3]" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          {/* Action: Edit Profile Button */}
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#F4F4F2] text-[#171717] text-xs font-semibold rounded-xl border border-[#E8E8E5] shadow-2xs transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Photo Preview Actions (shown when new photo is selected) */}
        {previewUrl && (
          <div className="mt-4 p-3.5 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-[#171717]">
              <Upload className="w-4 h-4 text-[#16834A]" />
              <span>New photo selected. Would you like to save it?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelPhoto}
                disabled={avatarUploading}
                className="px-3 py-1.5 text-xs text-[#737373] hover:text-[#171717] rounded-lg border border-[#E8E8E5] bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={avatarUploading}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-lg transition-colors"
              >
                {avatarUploading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Save Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* Permanent UID Display with Copy UID Action */}
        <div className="mt-5 pt-4 border-t border-[#F4F4F2] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#737373] uppercase tracking-wider">Permanent UID:</span>
            <code className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-lg text-xs font-mono text-[#171717] select-all">
              {user?.id}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyUid}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copiedUid
                ? 'bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF]'
                : 'bg-[#FAFAF8] text-[#171717] hover:bg-[#F4F4F2] border border-[#E8E8E5]'
            }`}
          >
            {copiedUid ? (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                <span>UID Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#737373]" />
                <span>Copy UID</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* --- 2. EDITABLE PERSONAL INFORMATION --- */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F2]">
          <div>
            <h2 className="text-base font-bold text-[#171717]">Personal Information</h2>
            <p className="text-xs text-[#737373] mt-0.5">Your public display info and bio</p>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="text-xs font-semibold text-[#16834A] hover:underline"
            >
              Edit Details
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Display Name (Public)
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your display name"
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Traveler Bio (Optional)
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Western Ghats rider, foodie, weekend traveler."
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
              />
            </div>

            {/* Location / City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                  City / Location (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A3A3A3]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru, India"
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A3A3A3]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
                  />
                </div>
              </div>
            </div>

            {/* Read-only notes inside edit form */}
            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5] text-xs text-[#737373] space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-[#171717]">
                <Lock className="w-3.5 h-3.5 text-[#A3A3A3]" />
                Account Identifier Notice:
              </p>
              <p>
                Your username (@{user?.username}), email address ({user?.email}), and permanent UID cannot be modified through normal profile settings to maintain transaction integrity.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile</span>
              </button>
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={profileSaving}
                className="px-4 py-2.5 text-xs text-[#737373] hover:text-[#171717] rounded-xl border border-[#E8E8E5] bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs font-semibold text-[#737373] block mb-1">Display Name</span>
              <p className="font-semibold text-[#171717]">{user?.full_name}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs font-semibold text-[#737373] block mb-1">Username (Permanent)</span>
              <p className="font-semibold text-[#16834A]">@{user?.username || 'user'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs font-semibold text-[#737373] block mb-1">Email Address (Read-only)</span>
              <p className="font-semibold text-[#171717] truncate">{user?.email}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs font-semibold text-[#737373] block mb-1">City / Location</span>
              <p className="font-medium text-[#171717]">{user?.city || 'Not provided'}</p>
            </div>

            {user?.bio && (
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
                <span className="text-xs font-semibold text-[#737373] block mb-1">Bio</span>
                <p className="text-[#171717] text-xs leading-relaxed">{user.bio}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- 3. PREFERENCES & CURRENCY --- */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-3 border-b border-[#F4F4F2]">
          <h2 className="text-base font-bold text-[#171717]">Trip Preferences</h2>
          <p className="text-xs text-[#737373] mt-0.5">Default currency for expenses and settlement suggestions</p>
        </div>

        {prefSuccess && (
          <div className="p-3 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{prefSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { code: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
            { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
            { code: 'EUR', label: 'Euro (€)', symbol: '€' },
            { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
          ].map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSaveCurrency(c.code)}
              disabled={prefSaving}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                defaultCurrency === c.code
                  ? 'border-[#16834A] bg-[#DDF5E5]/20 ring-1 ring-[#16834A]'
                  : 'border-[#E8E8E5] bg-[#FAFAF8] hover:bg-[#F4F4F2]'
              }`}
            >
              <span className="text-xl font-bold font-mono text-[#171717] block mb-0.5">
                {c.symbol}
              </span>
              <span className="text-xs font-semibold text-[#171717] block">{c.code}</span>
              <span className="text-[10px] text-[#737373]">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Audio & Sound Effects Preference */}
        <div className="pt-4 border-t border-[#F4F4F2]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center text-[#171717] flex-shrink-0 shadow-2xs">
                {soundsEnabled ? (
                  <Volume2 className="w-5 h-5 text-[#16834A]" />
                ) : (
                  <VolumeX className="w-5 h-5 text-[#A3A3A3]" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#171717]">
                  Interaction Sounds &amp; Audio Feedback
                </p>
                <p className="text-xs text-[#737373] mt-0.5">
                  Subtle original audio chimes for trip creation, settlements, expenses, and alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {soundsEnabled && (
                <button
                  type="button"
                  onClick={() => playSound('trip_success')}
                  className="px-3 py-1.5 text-xs font-semibold text-[#16834A] bg-[#DDF5E5] hover:bg-[#C6ECCF] rounded-lg transition-colors cursor-pointer"
                >
                  Test Chime
                </button>
              )}

              <button
                type="button"
                role="switch"
                aria-checked={soundsEnabled}
                aria-label="Toggle interaction sounds"
                onClick={() => {
                  const nextState = !soundsEnabled;
                  setSoundsEnabled(nextState);
                  if (nextState) {
                    playSound('click');
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundsEnabled ? 'bg-[#16834A]' : 'bg-[#D6D6D2]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    soundsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. SECURITY & PASSWORD --- */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F2]">
          <div>
            <h2 className="text-base font-bold text-[#171717]">Security &amp; Password</h2>
            <p className="text-xs text-[#737373] mt-0.5">Protect your account and financial data</p>
          </div>
          {!isChangingPassword && (
            <button
              type="button"
              onClick={() => setIsChangingPassword(true)}
              className="text-xs font-semibold text-[#16834A] hover:underline"
            >
              Change Password
            </button>
          )}
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-[#16834A]" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-[#E11D48]" />
            <span>{passwordError}</span>
          </div>
        )}

        {isChangingPassword ? (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
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
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3] hover:text-[#171717]"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                New Password (Min 8 chars)
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3] hover:text-[#171717]"
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
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-5 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordError(null);
                }}
                className="px-4 py-2.5 text-xs text-[#737373] hover:text-[#171717] rounded-xl border border-[#E8E8E5] bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between p-3.5 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5] text-xs">
            <span className="text-[#737373]">Password was set upon registration</span>
            <span className="text-[#16834A] font-semibold">Protected with secure hashing</span>
          </div>
        )}
      </section>

      {/* --- 5. ACCOUNT ACTIONS & DANGER ZONE --- */}
      <section className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-3 border-b border-[#F4F4F2]">
          <h2 className="text-base font-bold text-[#171717]">Account Actions</h2>
          <p className="text-xs text-[#737373] mt-0.5">
            Member since {memberSince || '2026'}. Standard username &amp; email account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAFAF8] hover:bg-[#F4F4F2] text-[#171717] text-xs font-semibold border border-[#E8E8E5] shadow-xs transition-colors"
          >
            <LogOut className="w-4 h-4 text-[#737373]" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#E11D48] hover:bg-[#FFE4E6]/50 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#FDA4AF] p-6 max-w-md w-full shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#E11D48]">Delete Account</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-[#737373] hover:text-[#171717]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#737373] leading-relaxed">
              This action permanently soft-deletes your account while conserving past trip expense records so group balances remain mathematically consistent.
            </p>

            <div className="p-3 bg-[#FFE4E6]/40 rounded-xl border border-[#FDA4AF] text-xs text-[#E11D48]">
              Type <strong className="font-mono font-bold">DELETE</strong> to confirm deletion.
            </div>

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#171717] focus:outline-none focus:border-[#E11D48]"
            />

            {deleteError && (
              <p className="text-xs text-[#E11D48]">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#737373] hover:text-[#171717] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmationText !== 'DELETE'}
                className="px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
