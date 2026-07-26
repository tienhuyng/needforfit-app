import { ApiSuccessResponse } from '@/types/auth';
import { api, getApiErrorMessage } from '@/services/auth.service';
import {
  AddExercisesInput,
  AddExercisesResponse,
  CreateProgramInput,
  CreateSessionInput,
  PaginatedResponse,
  ProgramSummary,
  PtDashboardResponse,
  TraineeDetailResponse,
  TraineeListItem,
  TraineeListQuery,
  TrainingProgram,
  WorkoutSession,
} from '@/types/pt';

export { getApiErrorMessage };export const ptApi = {
  getDashboard: async (): Promise<PtDashboardResponse> => {
    const res = await api.get<ApiSuccessResponse<PtDashboardResponse>>('/pt/dashboard');
    return res.data.data;
  },

  getTrainees: async (query: TraineeListQuery = {}): Promise<PaginatedResponse<TraineeListItem>> => {
    const res = await api.get<ApiSuccessResponse<PaginatedResponse<TraineeListItem>>>(
      '/pt/trainees',
      { params: query }
    );
    return res.data.data;
  },

  getTrainee: async (id: string): Promise<TraineeDetailResponse> => {
    const res = await api.get<ApiSuccessResponse<TraineeDetailResponse>>(`/pt/trainees/${id}`);
    return res.data.data;
  },

  getPrograms: async (): Promise<ProgramSummary[]> => {
    const res = await api.get<ApiSuccessResponse<ProgramSummary[]>>('/pt/programs');
    return res.data.data;
  },

  createProgram: async (data: CreateProgramInput): Promise<TrainingProgram> => {
    const res = await api.post<ApiSuccessResponse<TrainingProgram>>('/pt/programs', data);
    return res.data.data;
  },

  createSession: async (
    programId: string,
    data: CreateSessionInput
  ): Promise<WorkoutSession> => {
    const res = await api.post<ApiSuccessResponse<WorkoutSession>>(
      `/pt/programs/${programId}/sessions`,
      data
    );
    return res.data.data;
  },

  addExercises: async (
    programId: string,
    sessionId: string,
    data: AddExercisesInput
  ): Promise<AddExercisesResponse> => {
    const res = await api.post<ApiSuccessResponse<AddExercisesResponse>>(
      `/pt/programs/${programId}/sessions/${sessionId}/exercises`,
      data
    );
    return res.data.data;
  },
};
