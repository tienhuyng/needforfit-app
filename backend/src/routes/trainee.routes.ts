import { Router } from 'express';
import * as traineeController from '../controllers/trainee.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  logMetricSchema,
  logWorkoutSchema,
  metricsHistoryQuerySchema,
  workoutHistoryQuerySchema,
} from '../validators/trainee.validator';

const router = Router();

router.use(authenticate, requireRoles('trainee'));

router.get('/home', traineeController.getHome);
router.get('/programs', traineeController.listPrograms);
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

export default router;
