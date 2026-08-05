import request from 'supertest';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { mockUser, prismaMock } from '../fixtures/auth.fixture';
import { authConfig } from '../../src/config/auth';

const app = createApp();

function userToken(userId = 'user-1', role: UserRole = UserRole.trainee) {
  return jwt.sign({ sub: userId, email: 'user@test.com', role }, authConfig.jwtSecret, {
    expiresIn: '1h',
  });
}

const traineeProfileRow = {
  id: 'tp-1',
  userId: 'user-1',
  dateOfBirth: new Date('1995-06-15'),
  heightCm: 175,
  currentWeightKg: 70,
  goal: 'gain_muscle' as const,
  injuryHistory: 'None',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth Profile Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).put('/api/auth/profile').send({ firstName: 'A' });
    expect(res.status).toBe(401);
  });

  it('returns profile for authenticated trainee', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      id: 'user-1',
      traineeProfile: traineeProfileRow,
    });

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe(mockUser.firstName);
    expect(res.body.data.traineeProfile.goal).toBe('gain_muscle');
  });

  it('updates profile for authenticated user', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        ...mockUser,
        id: 'user-1',
        traineeProfile: traineeProfileRow,
      })
      .mockResolvedValueOnce({
        ...mockUser,
        id: 'user-1',
        firstName: 'Updated',
        preferredLanguage: 'en',
        traineeProfile: { ...traineeProfileRow, goal: 'lose_weight' },
      });

    prismaMock.user.update.mockResolvedValue({
      ...mockUser,
      id: 'user-1',
      firstName: 'Updated',
      preferredLanguage: 'en',
    });

    prismaMock.traineeProfile.update.mockResolvedValue({
      ...traineeProfileRow,
      goal: 'lose_weight',
    });

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ firstName: 'Updated', preferredLanguage: 'en', goal: 'lose_weight' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('Updated');
    expect(res.body.data.traineeProfile.goal).toBe('lose_weight');
  });
});
