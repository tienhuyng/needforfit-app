import { ApiSuccessResponse } from '@/types/auth';
import { api, getApiErrorMessage } from '@/services/auth.service';
import {
  AddExercisesInput,
  AddExercisesResponse,
  AssignProgramInput,
  CreateProgramInput,
  CreateSessionInput,
  PaginatedResponse,
  ProgramDetailResponse,
  ProgramSummary,
  PtDashboardResponse,
  SessionDetailResponse,
  SessionSummary,
  TraineeDetailResponse,
  TraineeListItem,
  TraineeListQuery,
  TrainingProgram,
  UpdateProgramInput,
  UpdateSessionInput,
  WorkoutSession,
} from '@/types/pt';

export { getApiErrorMessage };

export const ptApi = {
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

  getProgram: async (id: string): Promise<ProgramDetailResponse> => {
    const res = await api.get<ApiSuccessResponse<ProgramDetailResponse>>(`/pt/programs/${id}`);
    return res.data.data;
  },

  createProgram: async (data: CreateProgramInput): Promise<TrainingProgram> => {
    const res = await api.post<ApiSuccessResponse<TrainingProgram>>('/pt/programs', data);
    return res.data.data;
  },

  updateProgram: async (id: string, data: UpdateProgramInput): Promise<TrainingProgram> => {
    const res = await api.put<ApiSuccessResponse<TrainingProgram>>(`/pt/programs/${id}`, data);
    return res.data.data;
  },

  assignProgram: async (
    id: string,
    data: AssignProgramInput
  ): Promise<{ program: TrainingProgram; assignedAt: string }> => {
    const res = await api.post<
      ApiSuccessResponse<{ program: TrainingProgram; assignedAt: string }>
    >(`/pt/programs/${id}/assign`, data);
    return res.data.data;
  },

  getSessions: async (programId: string): Promise<SessionSummary[]> => {
    const res = await api.get<ApiSuccessResponse<SessionSummary[]>>(
      `/pt/programs/${programId}/sessions`
    );
    return res.data.data;
  },

  getSession: async (programId: string, sessionId: string): Promise<SessionDetailResponse> => {
    const res = await api.get<ApiSuccessResponse<SessionDetailResponse>>(
      `/pt/programs/${programId}/sessions/${sessionId}`
    );
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

  updateSession: async (
    programId: string,
    sessionId: string,
    data: UpdateSessionInput
  ): Promise<WorkoutSession> => {
    const res = await api.put<ApiSuccessResponse<WorkoutSession>>(
      `/pt/programs/${programId}/sessions/${sessionId}`,
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

  deleteSession: async (programId: string, sessionId: string): Promise<void> => {
    await api.delete(`/pt/programs/${programId}/sessions/${sessionId}`);
  },

  scheduleSession: async (
    programId: string,
    sessionId: string,
    dates: string[]
  ): Promise<{ createdSessionIds: string[] }> => {
    const res = await api.post<ApiSuccessResponse<{ createdSessionIds: string[] }>>(
      `/pt/programs/${programId}/sessions/${sessionId}/schedule`,
      { dates }
    );
    return res.data.data;
  },

  inviteTrainee: async (email: string) => {
    const res = await api.post<ApiSuccessResponse<unknown>>('/pt/trainees/invite', { email });
    return res.data;
  },

  resendInvite: async (assignmentId: string) => {
    const res = await api.post<ApiSuccessResponse<unknown>>(
      `/pt/trainees/assignments/${assignmentId}/resend-invite`
    );
    return res.data;
  },

  cancelInvite: async (assignmentId: string) => {
    await api.delete(`/pt/trainees/assignments/${assignmentId}`);
  },
};
