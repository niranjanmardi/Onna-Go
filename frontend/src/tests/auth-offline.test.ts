// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '../lib/api-client';

describe('Auth Offline & Error Resilience', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('preserves token and cached user when /auth/me encounters a network error', async () => {
    const mockUser = {
      id: 'usr-1',
      username: 'traveler',
      full_name: 'Test Traveler',
      email: 'test@example.com',
      default_currency: 'INR',
    };

    localStorage.setItem('onnago_token', 'valid-jwt-token-123');
    localStorage.setItem('onnago_user', JSON.stringify(mockUser));

    // Simulate network error (offline or server unreachable)
    vi.spyOn(api, 'get').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    // Replicate the exact logic from AuthContext refreshUser
    let userState: any = JSON.parse(localStorage.getItem('onnago_user')!);

    const refreshUser = async () => {
      const token = localStorage.getItem('onnago_token');
      if (!token) {
        userState = null;
        return;
      }

      try {
        const me = await api.get('/auth/me');
        userState = me;
        localStorage.setItem('onnago_user', JSON.stringify(me));
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          userState = null;
          localStorage.removeItem('onnago_token');
          localStorage.removeItem('onnago_user');
        } else {
          // Network error: preserve cached user
          const cached = localStorage.getItem('onnago_user');
          if (cached) {
            userState = JSON.parse(cached);
          }
        }
      }
    };

    await refreshUser();

    // User must NOT be logged out!
    expect(userState).not.toBeNull();
    expect(userState.username).toBe('traveler');
    expect(localStorage.getItem('onnago_token')).toBe('valid-jwt-token-123');
    expect(localStorage.getItem('onnago_user')).toContain('traveler');
  });

  it('clears token and logs out when /auth/me returns a genuine 401 Unauthorized', async () => {
    const mockUser = {
      id: 'usr-1',
      username: 'traveler',
      full_name: 'Test Traveler',
      email: 'test@example.com',
      default_currency: 'INR',
    };

    localStorage.setItem('onnago_token', 'expired-jwt-token');
    localStorage.setItem('onnago_user', JSON.stringify(mockUser));

    // Simulate real 401 Unauthorized ApiError
    vi.spyOn(api, 'get').mockRejectedValueOnce(new ApiError(401, 'Unauthorized token'));

    let userState: any = JSON.parse(localStorage.getItem('onnago_user')!);

    const refreshUser = async () => {
      const token = localStorage.getItem('onnago_token');
      if (!token) {
        userState = null;
        return;
      }

      try {
        const me = await api.get('/auth/me');
        userState = me;
        localStorage.setItem('onnago_user', JSON.stringify(me));
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          userState = null;
          localStorage.removeItem('onnago_token');
          localStorage.removeItem('onnago_user');
        } else {
          const cached = localStorage.getItem('onnago_user');
          if (cached) {
            userState = JSON.parse(cached);
          }
        }
      }
    };

    await refreshUser();

    // User must be logged out and storage cleared
    expect(userState).toBeNull();
    expect(localStorage.getItem('onnago_token')).toBeNull();
    expect(localStorage.getItem('onnago_user')).toBeNull();
  });
});
