import { describe, it, expect } from 'vitest';
import {
  createLogMetricSchema,
  createLogWorkoutSchema,
  toLogMetricPayload,
  toLogWorkoutPayload,
} from '@/utils/trainee-validation';

describe('trainee-validation', () => {
  const t = (key: string) => key;

  it('requires weight in metric schema', () => {
    const schema = createLogMetricSchema(t);
    expect(schema.safeParse({ measurementDate: '2026-07-27' }).success).toBe(false);
  });

  it('builds log workout payload', () => {
    const schema = createLogWorkoutSchema(t);
    const parsed = schema.parse({
      exercises: [
        {
          exerciseName: 'Squat',
          setEntries: [
            { reps: 10, weightKg: 60 },
            { reps: 8, weightKg: 62.5 },
          ],
        },
      ],
      feedback: {
        difficultyRating: 5,
        fatigueRating: 4,
        painOrDiscomfort: 'no',
        templateResponses: { q1: 'a', q2: 'b', q3: 'c' },
      },
    });
    const payload = toLogWorkoutPayload('session-1', parsed);
    expect(payload.sessionId).toBe('session-1');
    expect(payload.exercises[0].setEntries).toHaveLength(2);
    expect(payload.feedback.painOrDiscomfort).toBe(false);
  });

  it('builds metric payload', () => {
    const payload = toLogMetricPayload({
      measurementDate: '2026-07-27',
      weightKg: 70,
      bodyFatPercent: undefined,
      muscleMassKg: undefined,
      notes: '',
    });
    expect(payload.weightKg).toBe(70);
  });
});
