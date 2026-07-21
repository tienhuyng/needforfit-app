import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../src/config/database';

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oX3g5q5q5q5q',
  firstName: 'Test',
  lastName: 'User',
  phone: null,
  avatarUrl: null,
  role: UserRole.trainee,
  status: UserStatus.active,
  preferredLanguage: 'vi' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockResetToken = {
  id: 'reset-123',
  userId: mockUser.id,
  token: 'reset-token-abc',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  usedAt: null,
  createdAt: new Date(),
};

export const prismaMock = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  passwordResetToken: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};
