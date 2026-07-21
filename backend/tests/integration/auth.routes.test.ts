import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app';
import { mockUser, prismaMock } from '../fixtures/auth.fixture';

const app = createApp();

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'vi')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'trainee',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
    });

    it('returns validation error for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'en')
        .send({
          email: 'not-an-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'trainee',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeDefined();
    });

    it('returns validation error for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'ja')
        .send({
          email: 'test@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
          role: 'trainee',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toContain('8');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const res = await request(app)
        .post('/api/auth/login')
        .set('Accept-Language', 'zh')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('sends reset link for existing email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.create.mockResolvedValue({
        id: 'reset-1',
        userId: mockUser.id,
        token: 'abc',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .set('Accept-Language', 'es')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('returns 404 for unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'missing@example.com' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns validation error when passwords mismatch', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'test@example.com',
          token: 'abc',
          newPassword: 'newpassword123',
          confirmPassword: 'different123',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
