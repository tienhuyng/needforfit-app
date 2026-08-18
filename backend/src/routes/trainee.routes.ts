import { Router } from 'express';
import * as traineeController from '../controllers/trainee.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  logMetricSchema,
  logWorkoutSchema,
  metricsHistoryQuerySchema,
  respondPtInviteSchema,
  workoutHistoryQuerySchema,
} from '../validators/trainee.validator';
import {
  addExercisesSchema,
  createProgramSchema,
  createSessionSchema,
  scheduleSessionSchema,
} from '../validators/pt.validator';

const router = Router();

router.use(authenticate, requireRoles('trainee'));

router.get('/home', traineeController.getHome);
router.post(
  '/invites/:assignmentId/respond',
  validateBody(respondPtInviteSchema),
  traineeController.respondToPtInvite
);
router.get('/programs', traineeController.listPrograms);
router.get('/programs/:programId/sessions', traineeController.getProgramSessions);
router.get('/programs/:programId/sessions/:sessionId', traineeController.getProgramSessionDetail);
router.get('/sessions/:sessionId', traineeController.getSessionDetail);

router.post('/workouts/log', validateBody(logWorkoutSchema), traineeController.logWorkout);
router.get(
  '/workouts/history',
  validateQuery(workoutHistoryQuerySchema),
  traineeController.getWorkoutHistory
);
router.get('/workouts/:id', traineeController.getWorkoutDetail);

router.post('/metrics', validateBody(logMetricSchema), traineeController.logMetric);
router.get(
  '/metrics/history',
  validateQuery(metricsHistoryQuerySchema),
  traineeController.getMetricsHistory
);
router.get('/metrics/progress', traineeController.getMetricsProgress);

router.post('/self-programs', validateBody(createProgramSchema), traineeController.createSelfProgram);
router.post(
  '/self-programs/:programId/sessions',
  validateBody(createSessionSchema),
  traineeController.createSelfSession
);
router.post(
  '/self-programs/:programId/sessions/:sessionId/exercises',
  validateBody(addExercisesSchema),
  traineeController.addSelfExercises
);
router.post(
  '/self-programs/:programId/sessions/:sessionId/schedule',
  validateBody(scheduleSessionSchema),
  traineeController.scheduleSelfSession
);

export default router;
