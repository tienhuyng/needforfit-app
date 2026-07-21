import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler, successMessage } from '../middleware/validation.middleware';
import { buildSuccessResponse } from '../utils/errors';
import { AUTH_I18N_KEYS } from '../types/errors';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input, req.language);
  res.status(201).json(
    buildSuccessResponse(result, successMessage(AUTH_I18N_KEYS.registerSuccess, req.language))
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const result = await authService.login(input, req.language);
  res.json(
    buildSuccessResponse(result, successMessage(AUTH_I18N_KEYS.loginSuccess, req.language))
  );
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ForgotPasswordInput;
  const result = await authService.forgotPassword(input, req.language);
  res.json(buildSuccessResponse(result));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ResetPasswordInput;
  const result = await authService.resetPassword(input, req.language);
  res.json(buildSuccessResponse(result));
});
