import { z } from 'zod';
import { AUTH_I18N_KEYS } from '../types/errors';

const emailSchema = z
  .string({ required_error: AUTH_I18N_KEYS.emailRequired })
  .min(1, AUTH_I18N_KEYS.emailRequired)
  .email(AUTH_I18N_KEYS.emailInvalid);

const passwordSchema = z
  .string({ required_error: AUTH_I18N_KEYS.passwordRequired })
  .min(8, AUTH_I18N_KEYS.passwordTooShort);

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: AUTH_I18N_KEYS.passwordRequired })
    .min(1, AUTH_I18N_KEYS.passwordRequired),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string({ required_error: AUTH_I18N_KEYS.firstNameRequired })
    .min(1, AUTH_I18N_KEYS.firstNameRequired),
  lastName: z
    .string({ required_error: AUTH_I18N_KEYS.lastNameRequired })
    .min(1, AUTH_I18N_KEYS.lastNameRequired),
  role: z.enum(['pt', 'trainee'], {
    errorMap: () => ({ message: AUTH_I18N_KEYS.roleInvalid }),
  }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z
      .string({ required_error: AUTH_I18N_KEYS.tokenRequired })
      .min(1, AUTH_I18N_KEYS.tokenRequired),
    newPassword: passwordSchema,
    confirmPassword: z
      .string({ required_error: AUTH_I18N_KEYS.passwordRequired })
      .min(1, AUTH_I18N_KEYS.passwordRequired),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: AUTH_I18N_KEYS.passwordMismatch,
    path: ['confirmPassword'],
  });

const traineeGoalSchema = z.enum([
  'lose_weight',
  'gain_muscle',
  'improve_health',
  'increase_strength',
  'improve_posture',
]);

const trainingModeSchema = z.enum(['self_training', 'coached']);

export const updateProfileSchema = z.object({
  firstName: z
    .string({ required_error: AUTH_I18N_KEYS.firstNameRequired })
    .min(1, AUTH_I18N_KEYS.firstNameRequired)
    .optional(),
  lastName: z
    .string({ required_error: AUTH_I18N_KEYS.lastNameRequired })
    .min(1, AUTH_I18N_KEYS.lastNameRequired)
    .optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['vi', 'en', 'zh', 'ja', 'es']).optional(),
  dateOfBirth: z.string().optional(),
  heightCm: z.coerce.number().positive().optional(),
  currentWeightKg: z.coerce.number().positive().optional(),
  goal: traineeGoalSchema.optional().or(z.literal('')),
  injuryHistory: z.string().optional(),
  trainingMode: trainingModeSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
