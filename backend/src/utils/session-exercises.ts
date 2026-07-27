import { WorkoutSessionExercise } from '@prisma/client';

export function getCurrentVersionExercises<T extends Pick<WorkoutSessionExercise, 'sessionVersion'>>(
  sessionVersion: number,
  exercises: T[]
): T[] {
  return exercises.filter((e) => e.sessionVersion === sessionVersion);
}
