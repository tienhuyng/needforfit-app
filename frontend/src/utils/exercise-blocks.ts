import type { AddExercisesFormData } from '@/utils/pt-validation';

export type SessionExerciseForBlocks = {
  exerciseName: string;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | string | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
  blockIndex: number;
  blockType: 'normal' | 'superset' | 'dropset';
};

const emptyExercise = {
  exerciseName: '',
  plannedSets: undefined as number | undefined,
  plannedReps: undefined as number | undefined,
  plannedWeightKg: undefined as number | undefined,
  restSeconds: undefined as number | undefined,
  notes: '',
};

export function sessionExercisesToFormBlocks(
  exercises: SessionExerciseForBlocks[]
): AddExercisesFormData['blocks'] {
  if (exercises.length === 0) {
    return [{ blockType: 'normal', exercises: [{ ...emptyExercise }] }];
  }

  const sorted = [...exercises].sort((a, b) => a.orderIndex - b.orderIndex);
  const byBlock = new Map<number, SessionExerciseForBlocks[]>();

  for (const exercise of sorted) {
    const blockIndex = exercise.blockIndex ?? 0;
    const list = byBlock.get(blockIndex) ?? [];
    list.push(exercise);
    byBlock.set(blockIndex, list);
  }

  const blockIndices = [...byBlock.keys()].sort((a, b) => a - b);

  return blockIndices.map((blockIndex) => {
    const items = byBlock.get(blockIndex)!;
    const blockType = items[0]?.blockType ?? 'normal';
    return {
      blockType,
      exercises: items.map((e) => ({
        exerciseName: e.exerciseName,
        plannedSets: e.plannedSets ?? undefined,
        plannedReps: e.plannedReps ?? undefined,
        plannedWeightKg:
          e.plannedWeightKg != null && e.plannedWeightKg !== ''
            ? Number(e.plannedWeightKg)
            : undefined,
        restSeconds: e.restSeconds ?? undefined,
        notes: e.notes ?? '',
      })),
    };
  });
}
