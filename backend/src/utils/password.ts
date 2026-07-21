import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { authConfig } from '../config/auth';
import { AuthTokenPayload, AuthUser, JwtSignResult } from '../types/auth';

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, authConfig.bcryptSaltRounds);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function signJwt(payload: AuthTokenPayload): JwtSignResult {
  const signOptions: SignOptions = {
    expiresIn: authConfig.jwtExpiresIn as SignOptions['expiresIn'],
  };
  const token = jwt.sign(payload, authConfig.jwtSecret, signOptions);

  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, expiresAt };
}

export function verifyJwt(token: string): AuthTokenPayload {
  return jwt.verify(token, authConfig.jwtSecret) as AuthTokenPayload;
}

export function toAuthUser(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: string;
  preferredLanguage: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status as AuthUser['status'],
    preferredLanguage: user.preferredLanguage as AuthUser['preferredLanguage'],
  };
}

export function generateResetToken(): string {
  return crypto.randomUUID();
}

export function getResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + authConfig.resetTokenExpiresHours);
  return expiry;
}
