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
  inviteTraineeSchema,
  updateProgramSchema,
  updateSessionSchema,
  scheduleSessionSchema,
} from '../validators/pt.validator';

const router = Router();

router.use(authenticate, requireRoles('pt', 'admin'));

router.get('/dashboard', ptController.getDashboard);
router.get('/trainees', validateQuery(traineeListQuerySchema), ptController.listTrainees);
router.post('/trainees/invite', validateBody(inviteTraineeSchema), ptController.inviteTrainee);
router.post('/trainees/assignments/:assignmentId/resend-invite', ptController.resendInvite);
router.delete('/trainees/assignments/:assignmentId', ptController.cancelInvite);
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
  '/programs/:id/sessions/:sessionId/schedule',
  validateBody(scheduleSessionSchema),
  ptController.scheduleSession
);
router.delete('/programs/:id/sessions/:sessionId', ptController.deleteSession);
router.post(
  '/programs/:id/sessions/:sessionId/exercises',
  validateBody(addExercisesSchema),
  ptController.addExercises
);

export default router;
