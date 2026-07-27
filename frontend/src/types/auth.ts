export type UserRole = 'admin' | 'pt' | 'trainee';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  preferredLanguage: string;
}

export interface ApiErrorDetail {
  field?: string;
  i18nKey: string;
  message: string;
}

export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message: string;
  errors?: ApiErrorDetail[];
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
  message?: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
}

export interface MessageResponse {
  message: string;
  resetToken?: string;
  resetLink?: string;
}
