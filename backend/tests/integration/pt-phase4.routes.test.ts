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

describe('PT Phase 4 Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pt/programs/:id', () => {
    it('returns program detail', async () => {
      prismaMock.trainingProgram.findFirst.mockResolvedValue({
        id: 'prog-1',
        ptId: 'pt-1',
        name: 'Strength',
        objective: null,
        programType: 'strength',
        durationWeeks: 8,
        status: 'draft',
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessions: [],
        assignments: [],
      });
      prismaMock.user.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/pt/programs/prog-1')
        .set('Authorization', `Bearer ${ptToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Strength');
    });
  });

  describe('POST /api/pt/programs/:id/assign', () => {
    it('returns 400 without traineeId', async () => {
      const res = await request(app)
        .post('/api/pt/programs/prog-1/assign')
        .set('Authorization', `Bearer ${ptToken()}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/pt/programs/:id/sessions/:sessionId', () => {
    it('returns 404 when session missing', async () => {
      prismaMock.trainingProgram.findFirst.mockResolvedValue({
        id: 'prog-1',
        ptId: 'pt-1',
        name: 'Strength',
        objective: null,
        programType: 'strength',
        durationWeeks: null,
        status: 'draft',
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.workoutSession.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/pt/programs/prog-1/sessions/sess-1')
        .set('Authorization', `Bearer ${ptToken()}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });
});
