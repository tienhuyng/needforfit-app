import { describe, it, expect } from 'vitest';
import { sessionExercisesToFormBlocks } from '@/utils/exercise-blocks';

describe('sessionExercisesToFormBlocks', () => {
  it('returns default block when empty', () => {
    const blocks = sessionExercisesToFormBlocks([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].blockType).toBe('normal');
  });

  it('groups exercises by blockIndex preserving order', () => {
    const blocks = sessionExercisesToFormBlocks([
      {
        exerciseName: 'Squat',
        plannedSets: 3,
        plannedReps: 10,
        plannedWeightKg: 60,
        restSeconds: 90,
        notes: null,
        orderIndex: 0,
        blockIndex: 0,
        blockType: 'normal',
      },
      {
        exerciseName: 'Curl',
        plannedSets: 3,
        plannedReps: 12,
        plannedWeightKg: 15,
        restSeconds: 60,
        notes: null,
        orderIndex: 1,
        blockIndex: 1,
        blockType: 'superset',
      },
      {
        exerciseName: 'Triceps',
        plannedSets: 3,
        plannedReps: 12,
        plannedWeightKg: 20,
        restSeconds: 60,
        notes: null,
        orderIndex: 2,
        blockIndex: 1,
        blockType: 'superset',
      },
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].exercises[0].exerciseName).toBe('Squat');
    expect(blocks[1].blockType).toBe('superset');
    expect(blocks[1].exercises).toHaveLength(2);
  });
});
