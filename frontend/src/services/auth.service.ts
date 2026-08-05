import axios, { AxiosError } from 'axios';
import i18n from '@/config/i18n';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  LoginResponse,
  MessageResponse,
  RegisterResponse,
} from '@/types/auth';
import {
  ForgotPasswordFormData,
  LoginFormData,
  RegisterFormData,
  ResetPasswordFormData,
} from '@/utils/validation';
import { getAuthToken } from '@/utils/auth-storage';

export { getAuthToken, storeAuthToken, clearAuthToken, storeAuthUser, getAuthUser, clearAuth, getPostLoginPath } from '@/utils/auth-storage';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language;
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiErrorMessage(error: unknown, fallbackKey: string): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const data = axiosError.response?.data;
    if (data?.errors?.[0]?.i18nKey) {
      return i18n.t(data.errors[0].i18nKey);
    }
    if (data?.message) {
      return data.message;
    }
  }
  return i18n.t(fallbackKey);
}

export const authApi = {
  login: async (data: LoginFormData): Promise<LoginResponse> => {
    const res = await api.post<ApiSuccessResponse<LoginResponse>>('/auth/login', data);
    return res.data.data;
  },

  register: async (data: Omit<RegisterFormData, 'confirmPassword'>): Promise<RegisterResponse> => {
    const res = await api.post<ApiSuccessResponse<RegisterResponse>>('/auth/register', data);
    return res.data.data;
  },

  forgotPassword: async (data: ForgotPasswordFormData): Promise<MessageResponse> => {
    const res = await api.post<ApiSuccessResponse<MessageResponse>>(
      '/auth/forgot-password',
      data
    );
    return res.data.data;
  },

  resetPassword: async (
    data: ResetPasswordFormData & { token: string }
  ): Promise<MessageResponse> => {
    const res = await api.post<ApiSuccessResponse<MessageResponse>>('/auth/reset-password', {
      email: data.email,
      token: data.token,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    });
    return res.data.data;
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    preferredLanguage?: string;
    dateOfBirth?: string;
    heightCm?: number;
    currentWeightKg?: number;
    goal?: string;
    injuryHistory?: string;
  }): Promise<import('@/types/auth').ProfileResponse> => {
    const res = await api.put<ApiSuccessResponse<import('@/types/auth').ProfileResponse>>(
      '/auth/profile',
      data
    );
    return res.data.data;
  },

  getProfile: async (): Promise<import('@/types/auth').ProfileResponse> => {
    const res = await api.get<ApiSuccessResponse<import('@/types/auth').ProfileResponse>>(
      '/auth/profile'
    );
    return res.data.data;
  },
};
