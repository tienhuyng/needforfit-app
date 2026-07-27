import { Request, Response } from 'express';
import { traineeService } from '../services/trainee.service';
import { asyncHandler } from '../middleware/validation.middleware';
import { buildSuccessResponse } from '../utils/errors';
import {
  LogMetricInput,
  LogWorkoutInput,
  MetricsHistoryQuery,
  WorkoutHistoryQuery,
} from '../validators/trainee.validator';

function getTraineeId(req: Request): string {
  if (!req.user) throw new Error('Unauthorized');
  return req.user.sub;
}

export const getHome = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.getHome(getTraineeId(req));
  res.json(buildSuccessResponse(data));
});

export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.listPrograms(getTraineeId(req));
  res.json(buildSuccessResponse(data));
});

export const getSessionDetail = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.getSessionDetail(getTraineeId(req), req.params.sessionId);
  res.json(buildSuccessResponse(data));
});

export const logWorkout = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LogWorkoutInput;
  const result = await traineeService.logWorkout(getTraineeId(req), input, req.language);
  res.status(201).json(buildSuccessResponse({ logId: result.logId }, result.message));
});

export const getWorkoutHistory = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as WorkoutHistoryQuery;
  const data = await traineeService.getWorkoutHistory(getTraineeId(req), query);
  res.json(buildSuccessResponse(data));
});

export const getWorkoutDetail = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.getWorkoutDetail(getTraineeId(req), req.params.id);
  res.json(buildSuccessResponse(data));
});

export const logMetric = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LogMetricInput;
  const result = await traineeService.logMetric(getTraineeId(req), input, req.language);
  res.status(201).json(buildSuccessResponse({ id: result.id }, result.message));
});

export const getMetricsHistory = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as MetricsHistoryQuery;
  const data = await traineeService.getMetricsHistory(getTraineeId(req), query);
  res.json(buildSuccessResponse(data));
});

export const getProgramSessions = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.getProgramSessions(getTraineeId(req), req.params.programId);
  res.json(buildSuccessResponse(data));
});

export const getProgramSessionDetail = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.getProgramSessionDetail(
    getTraineeId(req),
    req.params.programId,
    req.params.sessionId
  );
  res.json(buildSuccessResponse(data));
});

export const getMetricsProgress = asyncHandler(async (req: Request, res: Response) => {
  const data = await traineeService.getMetricsProgress(getTraineeId(req));
  res.json(buildSuccessResponse(data));
});
