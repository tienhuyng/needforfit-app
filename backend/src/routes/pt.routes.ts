import { Router } from 'express';
import * as ptController from '../controllers/pt.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  addExercisesSchema,
  assignProgramSchema,
  createProgramSchema,
  createSessionSchema,
  traineeListQuerySchema,
  updateProgramSchema,
  updateSessionSchema,
} from '../validators/pt.validator';

const router = Router();

router.use(authenticate, requireRoles('pt', 'admin'));

router.get('/dashboard', ptController.getDashboard);
router.get('/trainees', validateQuery(traineeListQuerySchema), ptController.listTrainees);
router.get('/trainees/:id', ptController.getTraineeDetail);

router.get('/programs', ptController.listPrograms);
router.post('/programs', validateBody(createProgramSchema), ptController.createProgram);
router.get('/programs/:id', ptController.getProgramDetail);
router.put('/programs/:id', validateBody(updateProgramSchema), ptController.updateProgram);
router.post('/programs/:id/assign', validateBody(assignProgramSchema), ptController.assignProgram);

router.get('/programs/:id/sessions', ptController.listSessions);
router.post('/programs/:id/sessions', validateBody(createSessionSchema), ptController.createSession);
router.get('/programs/:id/sessions/:sessionId', ptController.getSessionDetail);
router.put(
  '/programs/:id/sessions/:sessionId',
  validateBody(updateSessionSchema),
  ptController.updateSession
);
router.post(
  '/programs/:id/sessions/:sessionId/exercises',
  validateBody(addExercisesSchema),
  ptController.addExercises
);

export default router;
