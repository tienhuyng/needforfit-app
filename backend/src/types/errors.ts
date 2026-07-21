export const AUTH_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  PASSWORD_SAME_AS_OLD: 'PASSWORD_SAME_AS_OLD',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export const AUTH_I18N_KEYS = {
  emailInvalid: 'auth.errors.emailInvalid',
  emailRequired: 'auth.errors.emailRequired',
  emailExists: 'auth.errors.emailExists',
  emailNotFound: 'auth.errors.emailNotFound',
  passwordRequired: 'auth.errors.passwordRequired',
  passwordTooShort: 'auth.errors.passwordTooShort',
  passwordIncorrect: 'auth.errors.passwordIncorrect',
  passwordSameAsOld: 'auth.errors.passwordSameAsOld',
  passwordMismatch: 'auth.errors.passwordMismatch',
  firstNameRequired: 'auth.errors.firstNameRequired',
  lastNameRequired: 'auth.errors.lastNameRequired',
  roleInvalid: 'auth.errors.roleInvalid',
  accountLocked: 'auth.errors.accountLocked',
  resetTokenInvalid: 'auth.errors.resetTokenInvalid',
  resetTokenExpired: 'auth.errors.resetTokenExpired',
  tokenRequired: 'auth.errors.tokenRequired',
  loginSuccess: 'auth.messages.loginSuccess',
  registerSuccess: 'auth.messages.registerSuccess',
  forgotPasswordSuccess: 'auth.messages.forgotPasswordSuccess',
  resetPasswordSuccess: 'auth.messages.resetPasswordSuccess',
} as const;
