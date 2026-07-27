import request from 'supertest';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { prismaMock } from '../fixtures/auth.fixture';
import { authConfig } from '../../src/config/auth';

const app = createApp();

function userToken(userId = 'user-1', role: UserRole = UserRole.trainee) {
  return jwt.sign({ sub: userId, email: 'user@test.com', role }, authConfig.jwtSecret, {
    expiresIn: '1h',
  });
}

describe('Auth Profile Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).put('/api/auth/profile').send({ firstName: 'A' });
    expect(res.status).toBe(401);
  });

  it('updates profile for authenticated user', async () => {
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      passwordHash: 'hash',
      firstName: 'Updated',
      lastName: 'User',
      phone: '123',
      avatarUrl: null,
      role: UserRole.trainee,
      status: 'active',
      preferredLanguage: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ firstName: 'Updated', preferredLanguage: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('Updated');
  });
});
