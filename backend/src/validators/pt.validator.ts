import { z } from 'zod';
import { PT_I18N_KEYS } from '../types/pt.errors';

const programTypeSchema = z.enum(['strength', 'cardio', 'flexibility', 'mixed'], {
  errorMap: () => ({ message: PT_I18N_KEYS.programTypeInvalid }),
});

const sessionTypeSchema = z.enum(['strength', 'cardio', 'flexibility'], {
  errorMap: () => ({ message: PT_I18N_KEYS.sessionTypeInvalid }),
});

export const createProgramSchema = z.object({
  name: z.string({ required_error: PT_I18N_KEYS.nameRequired }).min(1, PT_I18N_KEYS.nameRequired),
  objective: z.string().optional(),
  programType: programTypeSchema,
  durationWeeks: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const createSessionSchema = z.object({
  name: z.string({ required_error: PT_I18N_KEYS.nameRequired }).min(1, PT_I18N_KEYS.nameRequired),
  sessionType: sessionTypeSchema,
  scheduledDate: z
    .string({ required_error: PT_I18N_KEYS.scheduledDateRequired })
    .min(1, PT_I18N_KEYS.scheduledDateRequired),
  estimatedDurationMinutes: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const exerciseItemSchema = z.object({
  exerciseName: z
    .string({ required_error: PT_I18N_KEYS.exerciseNameRequired })
    .min(1, PT_I18N_KEYS.exerciseNameRequired),
  plannedSets: z.coerce.number().int().positive(PT_I18N_KEYS.positiveNumber).optional(),
  plannedReps: z.coerce.number().int().positive(PT_I18N_KEYS.positiveNumber).optional(),
  plannedWeightKg: z.coerce.number().positive(PT_I18N_KEYS.positiveNumber).optional(),
  restSeconds: z.coerce.number().int().positive(PT_I18N_KEYS.positiveNumber).optional(),
  notes: z.string().optional(),
});

export const addExercisesSchema = z.object({
  exercises: z.array(exerciseItemSchema).min(1, PT_I18N_KEYS.exerciseNameRequired),
});

export const traineeListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'paused', 'ended']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const updateProgramSchema = createProgramSchema.partial();

export const assignProgramSchema = z.object({
  traineeId: z
    .string({ required_error: PT_I18N_KEYS.traineeIdRequired })
    .uuid(PT_I18N_KEYS.traineeIdRequired),
});

export const updateSessionSchema = createSessionSchema.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  exercises: z.array(exerciseItemSchema).optional(),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type AssignProgramInput = z.infer<typeof assignProgramSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type AddExercisesInput = z.infer<typeof addExercisesSchema>;
export type TraineeListQuery = z.infer<typeof traineeListQuerySchema>;
