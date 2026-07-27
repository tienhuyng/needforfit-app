import bcrypt from 'bcrypt';
import { authService } from '../../src/services/auth.service';
import { mockResetToken, mockUser, prismaMock } from '../fixtures/auth.fixture';
import { UserRole } from '@prisma/client';

jest.mock('../../src/services/email.service', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a new user and returns token', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(
        {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'trainee',
        },
        'vi'
      );

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('throws when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register(
          {
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'trainee',
          },
          'vi'
        )
      ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });
    });
  });

  describe('login', () => {
    it('returns token for valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await authService.login(
        { email: 'test@example.com', password: 'password123' },
        'vi'
      );

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws for invalid password', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpass' }, 'vi')
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('throws for non-existent email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'missing@example.com', password: 'password123' }, 'vi')
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });

  describe('forgotPassword', () => {
    it('creates reset token for existing user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.create.mockResolvedValue(mockResetToken);

      const result = await authService.forgotPassword(
        { email: 'test@example.com' },
        'en'
      );

      expect(result.message).toContain('Password reset');
      expect(result.resetToken).toBeDefined();
      expect(result.resetLink).toContain('/reset-password?token=');
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();
    });

    it('throws for unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.forgotPassword({ email: 'missing@example.com' }, 'vi')
      ).rejects.toMatchObject({ code: 'EMAIL_NOT_FOUND' });
    });
  });

  describe('resetPassword', () => {
    it('updates password with valid token', async () => {
      const oldHash = await bcrypt.hash('oldpassword', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: oldHash });
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(mockResetToken);
      prismaMock.$transaction.mockResolvedValue([mockUser, mockResetToken]);

      const result = await authService.resetPassword(
        {
          email: 'test@example.com',
          token: 'reset-token-abc',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        },
        'vi'
      );

      expect(result.message).toBeDefined();
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('throws when token is invalid', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword(
          {
            email: 'test@example.com',
            token: 'invalid-token',
            newPassword: 'newpassword123',
            confirmPassword: 'newpassword123',
          },
          'vi'
        )
      ).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
    });

    it('throws when new password same as old', async () => {
      const hash = await bcrypt.hash('samepassword', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(mockResetToken);

      await expect(
        authService.resetPassword(
          {
            email: 'test@example.com',
            token: 'reset-token-abc',
            newPassword: 'samepassword',
            confirmPassword: 'samepassword',
          },
          'vi'
        )
      ).rejects.toMatchObject({ code: 'PASSWORD_SAME_AS_OLD' });
    });
  });
});
