process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fithub_test';

jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ptTraineeAssignment: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    trainingProgram: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    workoutLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    programTraineeAssignment: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    workoutSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    workoutSessionExercise: {
      create: jest.fn(),
    },
    bodyMeasurementLog: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  disconnectDatabase: jest.fn(),
}));
