import { env } from './env';

export const authConfig = {
  jwtSecret: env.jwtSecret,
  jwtExpiresIn: env.jwtExpiresIn,
  bcryptSaltRounds: 12,
  resetTokenExpiresHours: 24,
} as const;
