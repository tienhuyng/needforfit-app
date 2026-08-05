export type WorkoutSetDetail = { reps?: number; weightKg?: number };

export type VolumeExerciseInput = {
  actualSets?: number | null;
  actualReps?: number | null;
  actualWeightKg?: number | null;
  setDetails?: WorkoutSetDetail[] | null;
};

export function parseSetDetails(raw: unknown): WorkoutSetDetail[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((item) => {
    if (!item || typeof item !== 'object') return {};
    const row = item as Record<string, unknown>;
    return {
      reps: typeof row.reps === 'number' ? row.reps : undefined,
      weightKg: typeof row.weightKg === 'number' ? row.weightKg : undefined,
    };
  });
}

export function exerciseVolumeKg(exercise: VolumeExerciseInput): number {
  const sets = exercise.setDetails;
  if (sets && sets.length > 0) {
    return sets.reduce((sum, s) => {
      if (s.reps != null && s.weightKg != null) return sum + s.reps * s.weightKg;
      return sum;
    }, 0);
  }
  if (
    exercise.actualReps != null &&
    exercise.actualWeightKg != null &&
    exercise.actualSets != null
  ) {
    return exercise.actualReps * exercise.actualWeightKg * exercise.actualSets;
  }
  return 0;
}

export function totalVolumeKg(exercises: VolumeExerciseInput[]): number {
  const total = exercises.reduce((sum, e) => sum + exerciseVolumeKg(e), 0);
  return Math.round(total * 10) / 10;
}
