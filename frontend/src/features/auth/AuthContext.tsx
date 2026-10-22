import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string, defaultCurrency?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
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
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      localStorage.setItem('onnago_user', JSON.stringify(me));
    } catch {
      setUser(null);
      localStorage.removeItem('onnago_token');
      localStorage.removeItem('onnago_user');
      localStorage.removeItem('rupaii_token');
      localStorage.removeItem('rupaii_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: User }>('/auth/login', {
        email,
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
    email: string,
    fullName: string,
    password: string,
    defaultCurrency = 'INR'
  ) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: User }>('/auth/register', {
        email,
        full_name: fullName,
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
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
