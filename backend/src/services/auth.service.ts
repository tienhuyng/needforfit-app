import { UserStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { SupportedLanguage, t } from '../config/i18n';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';
import {
  comparePassword,
  generateResetToken,
  getResetTokenExpiry,
  hashPassword,
  signJwt,
  toAuthUser,
} from '../utils/password';
import { AppError } from '../utils/errors';
import { AUTH_ERROR_CODES, AUTH_I18N_KEYS } from '../types/errors';
import {
  LoginResponse,
  MessageResponse,
  RegisterResponse,
} from '../types/auth';

export class AuthService {
  async register(input: RegisterInput, lng: SupportedLanguage): Promise<RegisterResponse> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError(
        AUTH_ERROR_CODES.EMAIL_EXISTS,
        AUTH_I18N_KEYS.emailExists,
        409
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        status: UserStatus.active,
        ...(input.role === 'trainee' ? { traineeProfile: { create: {} } } : {}),
        ...(input.role === 'pt' ? { ptProfile: { create: {} } } : {}),
      },
    });

    const { token } = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: toAuthUser(user),
      token,
    };
  }

  async login(input: LoginInput, lng: SupportedLanguage): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        AUTH_I18N_KEYS.emailNotFound,
        401
      );
    }

    if (user.status === UserStatus.inactive || user.status === UserStatus.deleted) {
      throw new AppError(
        AUTH_ERROR_CODES.ACCOUNT_LOCKED,
        AUTH_I18N_KEYS.accountLocked,
        403
      );
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        AUTH_I18N_KEYS.passwordIncorrect,
        401
      );
    }

    const { token, expiresAt } = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: toAuthUser(user),
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async forgotPassword(
    input: ForgotPasswordInput,
    lng: SupportedLanguage
  ): Promise<MessageResponse & { resetToken?: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(
        AUTH_ERROR_CODES.EMAIL_NOT_FOUND,
        AUTH_I18N_KEYS.emailNotFound,
        404
      );
    }

    const token = generateResetToken();
    const expiresAt = getResetTokenExpiry();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const response: MessageResponse & { resetToken?: string } = {
      message: t(AUTH_I18N_KEYS.forgotPasswordSuccess, lng),
    };

    // In development, return token for testing; in production, send via email
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = token;
    }

    return response;
  }

  async resetPassword(
    input: ResetPasswordInput,
    lng: SupportedLanguage
  ): Promise<MessageResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(
        AUTH_ERROR_CODES.EMAIL_NOT_FOUND,
        AUTH_I18N_KEYS.emailNotFound,
        404
      );
    }

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: input.token,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      throw new AppError(
        AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
        AUTH_I18N_KEYS.resetTokenInvalid,
        400
      );
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new AppError(
        AUTH_ERROR_CODES.RESET_TOKEN_EXPIRED,
        AUTH_I18N_KEYS.resetTokenExpired,
        400
      );
    }

    const sameAsOld = await comparePassword(input.newPassword, user.passwordHash);
    if (sameAsOld) {
      throw new AppError(
        AUTH_ERROR_CODES.PASSWORD_SAME_AS_OLD,
        AUTH_I18N_KEYS.passwordSameAsOld,
        400
      );
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message: t(AUTH_I18N_KEYS.resetPasswordSuccess, lng),
    };
  }
}

export const authService = new AuthService();
