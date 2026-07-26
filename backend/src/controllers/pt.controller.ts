import { Request, Response } from 'express';
import { ptService } from '../services/pt.service';
import { asyncHandler, successMessage } from '../middleware/validation.middleware';
import { buildSuccessResponse } from '../utils/errors';
import { getPtId } from '../middleware/auth.middleware';
import { PT_I18N_KEYS } from '../types/pt.errors';
import {
  AddExercisesInput,
  CreateProgramInput,
  CreateSessionInput,
  TraineeListQuery,
} from '../validators/pt.validator';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await ptService.getDashboard(getPtId(req));
  res.json(buildSuccessResponse(data));
});

export const listTrainees = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as TraineeListQuery;
  const data = await ptService.listTrainees(getPtId(req), query);
  res.json(buildSuccessResponse(data));
});

export const getTraineeDetail = asyncHandler(async (req: Request, res: Response) => {
  const data = await ptService.getTraineeDetail(getPtId(req), req.params.id);
  res.json(buildSuccessResponse(data));
});

export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  const data = await ptService.listPrograms(getPtId(req));
  res.json(buildSuccessResponse(data));
});

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateProgramInput;
  const result = await ptService.createProgram(getPtId(req), input, req.language);
  res.status(201).json(buildSuccessResponse(result.program, result.message));
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateSessionInput;
  const result = await ptService.createSession(
    getPtId(req),
    req.params.id,
    input,
    req.language
  );
  res.status(201).json(buildSuccessResponse(result.session, result.message));
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const data = await ptService.listSessions(getPtId(req), req.params.id);
  res.json(buildSuccessResponse(data));
});

export const addExercises = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as AddExercisesInput;
  const result = await ptService.addExercises(
    getPtId(req),
    req.params.id,
    req.params.sessionId,
    input,
    req.language
  );
  res.status(201).json(buildSuccessResponse({ exercises: result.exercises }, result.message));
});
