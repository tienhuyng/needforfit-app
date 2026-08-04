import { z } from 'zod';
import { TRAINEE_I18N_KEYS } from '../types/trainee.errors';

const ratingSchema = z.coerce
  .number({ required_error: TRAINEE_I18N_KEYS.ratingRange })
  .int(TRAINEE_I18N_KEYS.ratingRange)
  .min(1, TRAINEE_I18N_KEYS.ratingRange)
  .max(10, TRAINEE_I18N_KEYS.ratingRange);

const logExerciseSchema = z.object({
  exerciseName: z
    .string({ required_error: TRAINEE_I18N_KEYS.exerciseRequired })
    .min(1, TRAINEE_I18N_KEYS.exerciseRequired),
  actualSets: z.coerce.number().int().positive(TRAINEE_I18N_KEYS.positiveNumber).optional(),
  actualReps: z.coerce.number().int().positive(TRAINEE_I18N_KEYS.positiveNumber).optional(),
  actualWeightKg: z.coerce.number().positive(TRAINEE_I18N_KEYS.positiveNumber).optional(),
  notes: z.string().optional(),
});

export const logWorkoutSchema = z.object({
  sessionId: z.string().uuid(),
  exercises: z.array(logExerciseSchema).min(1, TRAINEE_I18N_KEYS.exerciseRequired),
  feedback: z.object({
    difficultyRating: ratingSchema,
    fatigueRating: ratingSchema,
    painOrDiscomfort: z.boolean({ required_error: TRAINEE_I18N_KEYS.painRequired }),
    templateResponses: z.object({
      q1: z.string().min(1, TRAINEE_I18N_KEYS.templateRequired),
      q2: z.string().min(1, TRAINEE_I18N_KEYS.templateRequired),
      q3: z.string().min(1, TRAINEE_I18N_KEYS.templateRequired),
    }),
    traineeNotes: z.string().optional(),
  }),
});

export const workoutHistoryQuerySchema = z.object({
  programId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const logMetricSchema = z.object({
  measurementDate: z
    .string({ required_error: TRAINEE_I18N_KEYS.futureDate })
    .min(1, TRAINEE_I18N_KEYS.futureDate),
  weightKg: z.coerce
    .number({ required_error: TRAINEE_I18N_KEYS.weightRequired })
    .positive(TRAINEE_I18N_KEYS.positiveNumber),
  bodyFatPercent: z.coerce.number().positive(TRAINEE_I18N_KEYS.positiveNumber).optional(),
  muscleMassKg: z.coerce.number().positive(TRAINEE_I18N_KEYS.positiveNumber).optional(),
  notes: z.string().optional(),
});

export const metricsHistoryQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export const respondPtInviteSchema = z.object({
  accept: z.boolean(),
});

export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
export type WorkoutHistoryQuery = z.infer<typeof workoutHistoryQuerySchema>;
export type LogMetricInput = z.infer<typeof logMetricSchema>;
export type MetricsHistoryQuery = z.infer<typeof metricsHistoryQuerySchema>;
export type RespondPtInviteInput = z.infer<typeof respondPtInviteSchema>;
