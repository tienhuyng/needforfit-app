import { describe, it, expect, beforeEach } from 'vitest';
import {
  storeAuthUser,
  getAuthUser,
  clearAuth,
  getPostLoginPath,
} from '@/utils/auth-storage';

describe('auth-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads auth user', () => {
    storeAuthUser({
      id: '1',
      email: 'a@test.com',
      firstName: 'A',
      lastName: 'B',
      phone: null,
      role: 'trainee',
      status: 'active',
      preferredLanguage: 'vi',
    });
    expect(getAuthUser()?.email).toBe('a@test.com');
  });

  it('returns post login path by role', () => {
    expect(getPostLoginPath('pt')).toBe('/pt/dashboard');
    expect(getPostLoginPath('trainee')).toBe('/trainee/home');
  });

  it('clears auth data', () => {
    storeAuthUser({
      id: '1',
      email: 'a@test.com',
      firstName: null,
      lastName: null,
      role: 'trainee',
      status: 'active',
      preferredLanguage: 'vi',
    });
    clearAuth();
    expect(getAuthUser()).toBeNull();
  });

  it('stores and reads auth token', async () => {
    const { storeAuthToken, getAuthToken, clearAuthToken } = await import('@/utils/auth-storage');
    storeAuthToken('token-123');
    expect(getAuthToken()).toBe('token-123');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });
});
