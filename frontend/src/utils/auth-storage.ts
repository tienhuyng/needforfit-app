import { AuthUser } from '@/types/auth';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function storeAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function storeAuthUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  clearAuthToken();
  clearAuthUser();
}

export function getPostLoginPath(role: AuthUser['role']): string {
  if (role === 'pt' || role === 'admin') {
    return '/pt/dashboard';
  }
  return '/';
}
