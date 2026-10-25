// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../lib/api-client';

describe('Create Account (Registration) Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('successfully registers user, persists onnago_token and onnago_user', async () => {
    const mockResponse = {
      access_token: 'new-jwt-token-xyz',
      token_type: 'bearer',
      user: {
        id: 'usr-999',
        username: 'rider_alex',
        full_name: 'Alex Rider',
        email: 'alex@example.com',
        default_currency: 'INR',
        auth_provider: 'email',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    // Emulate register execution from AuthContext
    const register = async (
      username: string,
      fullName: string,
      email: string,
      password: string,
      defaultCurrency = 'INR'
    ) => {
      const data = await api.post<{ access_token: string; user: any }>('/auth/register', {
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        default_currency: defaultCurrency,
      });
      localStorage.setItem('onnago_token', data.access_token);
      localStorage.setItem('onnago_user', JSON.stringify(data.user));
      return data.user;
    };

    const createdUser = await register('  Rider_Alex  ', '  Alex Rider  ', '  ALEX@Example.com  ', 'SecurePassword123!', 'INR');

    expect(postSpy).toHaveBeenCalledWith('/auth/register', {
      username: 'rider_alex',
      full_name: 'Alex Rider',
      email: 'alex@example.com',
      password: 'SecurePassword123!',
      default_currency: 'INR',
    });

    expect(createdUser.username).toBe('rider_alex');
    expect(localStorage.getItem('onnago_token')).toBe('new-jwt-token-xyz');
    expect(JSON.parse(localStorage.getItem('onnago_user')!).email).toBe('alex@example.com');
  });

  it('validates username format rules (3-20 chars alphanumeric + underscore)', () => {
    const validRegex = /^[a-zA-Z0-9_]{3,20}$/;

    expect(validRegex.test('abc')).toBe(true);
    expect(validRegex.test('rider_alex_123')).toBe(true);
    expect(validRegex.test('ab')).toBe(false); // too short
    expect(validRegex.test('user@name')).toBe(false); // special char
    expect(validRegex.test('user name')).toBe(false); // space
    expect(validRegex.test('a'.repeat(21))).toBe(false); // too long
  });

  it('validates email format regex correctly', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test('alex@example.com')).toBe(true);
    expect(emailRegex.test('rider.alex+split@onna-go.app')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('missing@domain')).toBe(false);
    expect(emailRegex.test('@missinguser.com')).toBe(false);
  });
});
