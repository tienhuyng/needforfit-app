import { describe, it, expect } from 'vitest';
import {
  createAddExercisesSchema,
  createProgramSchema,
  createSessionSchema,
} from '@/utils/pt-validation';

describe('pt-validation', () => {
  const t = (key: string) => key;

  it('validates program name is required', () => {
    const schema = createProgramSchema(t);
    const result = schema.safeParse({ programType: 'strength' });
    expect(result.success).toBe(false);
  });

  it('accepts valid program payload', () => {
    const schema = createProgramSchema(t);
    const result = schema.safeParse({
      name: 'Strength Plan',
      programType: 'strength',
      durationWeeks: 8,
    });
    expect(result.success).toBe(true);
  });

  it('validates session scheduled date', () => {
    const schema = createSessionSchema(t);
    expect(schema.safeParse({ name: 'Day 1', sessionType: 'strength' }).success).toBe(false);
  });

  it('requires exercise blocks in add schema', () => {
    const schema = createAddExercisesSchema(t);
    expect(schema.safeParse({ blocks: [] }).success).toBe(false);
    expect(
      schema.safeParse({
        blocks: [{ blockType: 'normal', exercises: [{ exerciseName: 'Squat' }] }],
      }).success
    ).toBe(true);
  });
});
