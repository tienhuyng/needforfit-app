import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createLoginSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t('auth.errors.emailRequired'))
      .email(t('auth.errors.emailInvalid')),
    password: z.string().min(1, t('auth.errors.passwordRequired')),
    rememberMe: z.boolean().optional(),
  });
}

export function createRegisterSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t('auth.errors.emailRequired'))
      .email(t('auth.errors.emailInvalid')),
    password: z.string().min(8, t('auth.errors.passwordTooShort')),
    firstName: z.string().min(1, t('auth.errors.firstNameRequired')),
    lastName: z.string().min(1, t('auth.errors.lastNameRequired')),
    role: z.enum(['pt', 'trainee'], {
      errorMap: () => ({ message: t('auth.errors.roleRequired') }),
    }),
  });
}

export function createForgotPasswordSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t('auth.errors.emailRequired'))
      .email(t('auth.errors.emailInvalid')),
  });
}

export function createResetPasswordSchema(t: TFunction) {
  return z
    .object({
      email: z
        .string()
        .min(1, t('auth.errors.emailRequired'))
        .email(t('auth.errors.emailInvalid')),
      newPassword: z.string().min(8, t('auth.errors.passwordTooShort')),
      confirmPassword: z.string().min(1, t('auth.errors.passwordRequired')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('auth.errors.passwordMismatch'),
      path: ['confirmPassword'],
    });
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
export type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;
