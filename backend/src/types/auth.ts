import { UserRole, UserStatus, SupportedLanguage } from '@prisma/client';

export type { UserRole, UserStatus, SupportedLanguage };

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  preferredLanguage: SupportedLanguage;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
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

export interface JwtSignResult {
  token: string;
  expiresAt: Date;
}

export interface TraineeProfileSettings {
  dateOfBirth: string | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  goal: string | null;
  trainingMode: string;
  injuryHistory: string | null;
}

export interface ProfileResponse {
  user: AuthUser;
  traineeProfile: TraineeProfileSettings | null;
}
