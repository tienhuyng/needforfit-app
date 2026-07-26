import { z } from 'zod';
import { TFunction } from 'i18next';

const optionalPositiveInt = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? undefined : val),
  z.coerce.number().int().positive().optional()
);

const optionalPositiveFloat = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? undefined : val),
  z.coerce.number().positive().optional()
);

export function createLogWorkoutSchema(t: TFunction) {
  const rating = z.coerce
    .number({ required_error: t('trainee.errors.ratingRequired') })
    .int()
    .min(1, t('trainee.errors.ratingRange'))
    .max(10, t('trainee.errors.ratingRange'));

  return z.object({
    exercises: z.array(
      z.object({
        exerciseName: z.string().min(1),
        actualSets: optionalPositiveInt,
        actualReps: optionalPositiveInt,
        actualWeightKg: optionalPositiveFloat,
        notes: z.string().optional(),
      })
    ),
    feedback: z.object({
      difficultyRating: rating,
      fatigueRating: rating,
      painOrDiscomfort: z.enum(['yes', 'no'], {
        required_error: t('trainee.errors.painRequired'),
      }),
      templateResponses: z.object({
        q1: z.string().min(1, t('trainee.errors.templateRequired')),
        q2: z.string().min(1, t('trainee.errors.templateRequired')),
        q3: z.string().min(1, t('trainee.errors.templateRequired')),
      }),
      traineeNotes: z.string().optional(),
    }),
  });
}

export type LogWorkoutFormData = z.infer<ReturnType<typeof createLogWorkoutSchema>>;

export function createLogMetricSchema(t: TFunction) {
  const optionalPositiveFloat = z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number().positive().optional()
  );

  return z.object({
    measurementDate: z.string().min(1, t('trainee.errors.dateRequired')),
    weightKg: z.coerce
      .number({ required_error: t('trainee.errors.weightRequired') })
      .positive(t('trainee.errors.positiveNumber')),
    bodyFatPercent: optionalPositiveFloat,
    muscleMassKg: optionalPositiveFloat,
    notes: z.string().optional(),
  });
}

export type LogMetricFormData = z.infer<ReturnType<typeof createLogMetricSchema>>;

export function toLogWorkoutPayload(
  sessionId: string,
  data: LogWorkoutFormData
): import('@/types/trainee').LogWorkoutInput {
  return {
    sessionId,
    exercises: data.exercises.map((e) => ({
      exerciseName: e.exerciseName,
      actualSets: e.actualSets,
      actualReps: e.actualReps,
      actualWeightKg: e.actualWeightKg,
      notes: e.notes,
    })),
    feedback: {
      difficultyRating: data.feedback.difficultyRating,
      fatigueRating: data.feedback.fatigueRating,
      painOrDiscomfort: data.feedback.painOrDiscomfort === 'yes',
      templateResponses: data.feedback.templateResponses,
      traineeNotes: data.feedback.traineeNotes,
    },
  };
}

export function toLogMetricPayload(
  data: LogMetricFormData
): import('@/types/trainee').LogMetricInput {
  return {
    measurementDate: data.measurementDate,
    weightKg: data.weightKg,
    bodyFatPercent: data.bodyFatPercent,
    muscleMassKg: data.muscleMassKg,
    notes: data.notes,
  };
}
