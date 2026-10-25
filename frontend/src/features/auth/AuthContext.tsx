import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    username: string,
    fullName: string,
    email: string,
    password: string,
    defaultCurrency?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteAccount: (confirmation: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('onnago_user') || localStorage.getItem('rupaii_user');
      if (!cached || cached === 'undefined' || cached === 'null') return null;
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem('onnago_user');
      localStorage.removeItem('rupaii_user');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      localStorage.setItem('onnago_user', JSON.stringify(me));
    } catch (err: any) {
      // ONLY log out if the server explicitly returned 401 Unauthorized
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        localStorage.removeItem('onnago_token');
        localStorage.removeItem('onnago_user');
        localStorage.removeItem('rupaii_token');
        localStorage.removeItem('rupaii_user');
      } else {
        // Network error, offline, or transient server issue:
        // Do NOT log out. Preserve stored token and restore cached user data.
        try {
          const cached = localStorage.getItem('onnago_user') || localStorage.getItem('rupaii_user');
          if (cached && cached !== 'undefined' && cached !== 'null') {
            setUser(JSON.parse(cached));
          }
        } catch {
          // Keep current user state
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleOnline = () => {
      const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
      if (token) {
        api.get<User>('/auth/me')
          .then((me) => {
            setUser(me);
            localStorage.setItem('onnago_user', JSON.stringify(me));
          })
          .catch((err) => {
            if (err instanceof ApiError && err.status === 401) {
              setUser(null);
              localStorage.removeItem('onnago_token');
              localStorage.removeItem('onnago_user');
              localStorage.removeItem('rupaii_token');
              localStorage.removeItem('rupaii_user');
            }
          });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: User }>('/auth/login', {
        email: identifier.trim(),
        password,
      });
      localStorage.setItem('onnago_token', data.access_token);
      localStorage.setItem('onnago_user', JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    fullName: string,
    email: string,
    password: string,
    defaultCurrency = 'INR'
  ) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: User }>('/auth/register', {
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        default_currency: defaultCurrency,
      });
      localStorage.setItem('onnago_token', data.access_token);
      localStorage.setItem('onnago_user', JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('onnago_token');
      localStorage.removeItem('onnago_user');
      localStorage.removeItem('rupaii_token');
      localStorage.removeItem('rupaii_user');
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const updated = await api.put<User>('/auth/me', data);
    setUser(updated);
    localStorage.setItem('onnago_user', JSON.stringify(updated));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const res = await api.uploadFile('/auth/avatar', file);
    if (res && res.avatar_url) {
      const updatedUser = { ...user!, avatar_url: res.avatar_url };
      setUser(updatedUser);
      localStorage.setItem('onnago_user', JSON.stringify(updatedUser));
      return res.avatar_url;
    }
    return '';
  };

  const deleteAccount = async (confirmation: string) => {
    await api.delete('/auth/me', { confirmation });
    localStorage.removeItem('onnago_token');
    localStorage.removeItem('onnago_user');
    localStorage.removeItem('rupaii_token');
    localStorage.removeItem('rupaii_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        uploadAvatar,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
