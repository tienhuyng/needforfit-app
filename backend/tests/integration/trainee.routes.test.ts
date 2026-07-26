import request from 'supertest';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { prismaMock } from '../fixtures/auth.fixture';
import { authConfig } from '../../src/config/auth';

const app = createApp();

function traineeToken(userId = 'trainee-1') {
  return jwt.sign(
    { sub: userId, email: 'trainee@test.com', role: UserRole.trainee },
    authConfig.jwtSecret,
    { expiresIn: '1h' }
  );
}

describe('Trainee Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/trainee/home', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/trainee/home');
      expect(res.status).toBe(401);
    });

    it('returns 403 for PT role', async () => {
      const ptToken = jwt.sign(
        { sub: 'pt-1', email: 'pt@test.com', role: UserRole.pt },
        authConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get('/api/trainee/home')
        .set('Authorization', `Bearer ${ptToken}`);
      expect(res.status).toBe(403);
    });

    it('returns home data for trainee', async () => {
      prismaMock.programTraineeAssignment.findMany.mockResolvedValue([]);
      prismaMock.workoutLog.findMany.mockResolvedValue([]);
      prismaMock.bodyMeasurementLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/trainee/home')
        .set('Authorization', `Bearer ${traineeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('todayWorkout');
      expect(res.body.data).toHaveProperty('upcomingWorkouts');
      expect(res.body.data).toHaveProperty('weightTrend');
    });
  });

  describe('POST /api/trainee/workouts/log', () => {
    it('returns 400 for invalid payload', async () => {
      const res = await request(app)
        .post('/api/trainee/workouts/log')
        .set('Authorization', `Bearer ${traineeToken()}`)
        .send({ sessionId: 'not-uuid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/trainee/metrics', () => {
    it('returns 400 when weight missing', async () => {
      const res = await request(app)
        .post('/api/trainee/metrics')
        .set('Authorization', `Bearer ${traineeToken()}`)
        .send({ measurementDate: '2026-07-20' });

      expect(res.status).toBe(400);
    });
  });
});
