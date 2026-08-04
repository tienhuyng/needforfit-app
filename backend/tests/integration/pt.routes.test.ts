import request from 'supertest';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { prismaMock } from '../fixtures/auth.fixture';
import { authConfig } from '../../src/config/auth';

const app = createApp();

function ptToken(userId = 'pt-1') {
  return jwt.sign({ sub: userId, email: 'pt@test.com', role: UserRole.pt }, authConfig.jwtSecret, {
    expiresIn: '1h',
  });
}

describe('PT Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pt/dashboard', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/pt/dashboard');
      expect(res.status).toBe(401);
    });

    it('returns dashboard data for PT', async () => {
      prismaMock.ptTraineeAssignment.count.mockResolvedValue(2);
      prismaMock.trainingProgram.count.mockResolvedValue(3);
      prismaMock.workoutLog.count.mockResolvedValue(5);
      prismaMock.ptTraineeAssignment.findMany.mockResolvedValue([]);
      prismaMock.workoutLog.findMany.mockResolvedValue([]);
      prismaMock.trainingProgram.findMany.mockResolvedValue([]);
      prismaMock.userNotification.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/pt/dashboard')
        .set('Authorization', `Bearer ${ptToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis.trainees).toBe(2);
    });
  });

  describe('POST /api/pt/programs', () => {
    it('creates a draft program', async () => {
      prismaMock.trainingProgram.create.mockResolvedValue({
        id: 'prog-1',
        ptId: 'pt-1',
        name: 'Strength Plan',
        objective: null,
        programType: 'strength',
        durationWeeks: 8,
        status: 'draft',
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/pt/programs')
        .set('Authorization', `Bearer ${ptToken()}`)
        .send({
          name: 'Strength Plan',
          programType: 'strength',
          durationWeeks: 8,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Strength Plan');
    });
  });
});
