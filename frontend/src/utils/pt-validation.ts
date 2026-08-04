import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createProgramSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('pt.errors.nameRequired')),
    objective: z.string().optional(),
    programType: z.enum(['strength', 'cardio', 'flexibility', 'mixed'], {
      errorMap: () => ({ message: t('pt.errors.programTypeInvalid') }),
    }),
    durationWeeks: z.coerce.number().int().positive(t('pt.errors.positiveNumber')).optional(),
    notes: z.string().optional(),
  });
}

export function createSessionSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('pt.errors.nameRequired')),
    sessionType: z.enum(['strength', 'cardio', 'flexibility'], {
      errorMap: () => ({ message: t('pt.errors.sessionTypeInvalid') }),
    }),
    scheduledDate: z.string().min(1, t('pt.errors.scheduledDateRequired')),
    estimatedDurationMinutes: z.coerce
      .number()
      .int()
      .positive(t('pt.errors.positiveNumber'))
      .optional(),
    notes: z.string().optional(),
  });
}

export function createExerciseItemSchema(t: TFunction) {
  return z.object({
    exerciseName: z.string().min(1, t('pt.errors.exerciseNameRequired')),
    plannedSets: z.coerce.number().int().positive(t('pt.errors.positiveNumber')).optional(),
    plannedReps: z.coerce.number().int().positive(t('pt.errors.positiveNumber')).optional(),
    plannedWeightKg: z.coerce.number().positive(t('pt.errors.positiveNumber')).optional(),
    restSeconds: z.coerce.number().int().positive(t('pt.errors.positiveNumber')).optional(),
    notes: z.string().optional(),
  });
}

export function createAddExercisesSchema(t: TFunction) {
  const exerciseItemSchema = createExerciseItemSchema(t);
  return z.object({
    blocks: z
      .array(
        z.object({
          blockType: z.enum(['normal', 'superset', 'dropset']),
          exercises: z.array(exerciseItemSchema).min(1, t('pt.errors.exerciseNameRequired')),
        })
      )
      .min(1, t('pt.errors.exerciseNameRequired')),
  });
}

export type CreateProgramFormData = z.infer<ReturnType<typeof createProgramSchema>>;
export type CreateSessionFormData = z.infer<ReturnType<typeof createSessionSchema>>;
export type ExerciseItemFormData = z.infer<ReturnType<typeof createExerciseItemSchema>>;
export type AddExercisesFormData = z.infer<ReturnType<typeof createAddExercisesSchema>>;
