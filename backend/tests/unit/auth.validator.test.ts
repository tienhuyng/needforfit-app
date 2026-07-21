import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../../src/validators/auth.validator';

describe('Auth Validators', () => {
  describe('loginSchema', () => {
    it('accepts valid login input', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid register input', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'trainee',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('requires valid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(true);
    });
  });

  describe('resetPasswordSchema', () => {
    it('requires matching passwords', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        token: 'abc123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        token: 'abc123',
        newPassword: 'newpassword123',
        confirmPassword: 'otherpassword',
      });
      expect(result.success).toBe(false);
    });
  });
});
