export const PT_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TRAINEE_NOT_ASSIGNED: 'TRAINEE_NOT_ASSIGNED',
  PROGRAM_NOT_FOUND: 'PROGRAM_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
} as const;

export const PT_I18N_KEYS = {
  unauthorized: 'pt.errors.unauthorized',
  forbidden: 'pt.errors.forbidden',
  notFound: 'pt.errors.notFound',
  traineeNotAssigned: 'pt.errors.traineeNotAssigned',
  programNotFound: 'pt.errors.programNotFound',
  sessionNotFound: 'pt.errors.sessionNotFound',
  nameRequired: 'pt.errors.nameRequired',
  programTypeInvalid: 'pt.errors.programTypeInvalid',
  sessionTypeInvalid: 'pt.errors.sessionTypeInvalid',
  scheduledDateRequired: 'pt.errors.scheduledDateRequired',
  exerciseNameRequired: 'pt.errors.exerciseNameRequired',
  positiveNumber: 'pt.errors.positiveNumber',
  programCreated: 'pt.messages.programCreated',
  sessionCreated: 'pt.messages.sessionCreated',
  exercisesAdded: 'pt.messages.exercisesAdded',
} as const;
