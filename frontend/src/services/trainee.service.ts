import { ApiSuccessResponse } from '@/types/auth';
import { api, getApiErrorMessage } from '@/services/auth.service';
import {
  LogMetricInput,
  LogWorkoutInput,
  MetricsProgressResponse,
  PaginatedResponse,
  SessionDetailResponse,
  TraineeHomeResponse,
  TraineeProgramItem,
  TraineeProgramSessionItem,
  WorkoutHistoryQuery,
  WorkoutHistorySummary,
  WorkoutLogDetail,
} from '@/types/trainee';

export { getApiErrorMessage };

export const traineeApi = {
  getHome: async (): Promise<TraineeHomeResponse> => {
    const res = await api.get<ApiSuccessResponse<TraineeHomeResponse>>('/trainee/home');
    return res.data.data;
  },

  respondToPtInvite: async (assignmentId: string, accept: boolean) => {
    const res = await api.post<ApiSuccessResponse<{ status: string }>>(
      `/trainee/invites/${assignmentId}/respond`,
      { accept }
    );
    return res.data;
  },

  getPrograms: async (): Promise<TraineeProgramItem[]> => {
    const res = await api.get<ApiSuccessResponse<TraineeProgramItem[]>>('/trainee/programs');
    return res.data.data;
  },

  getProgramSessions: async (programId: string): Promise<TraineeProgramSessionItem[]> => {
    const res = await api.get<ApiSuccessResponse<TraineeProgramSessionItem[]>>(
      `/trainee/programs/${programId}/sessions`
    );
    return res.data.data;
  },

  getProgramSession: async (
    programId: string,
    sessionId: string
  ): Promise<SessionDetailResponse> => {
    const res = await api.get<ApiSuccessResponse<SessionDetailResponse>>(
      `/trainee/programs/${programId}/sessions/${sessionId}`
    );
    return res.data.data;
  },

  getSession: async (sessionId: string): Promise<SessionDetailResponse> => {
    const res = await api.get<ApiSuccessResponse<SessionDetailResponse>>(
      `/trainee/sessions/${sessionId}`
    );
    return res.data.data;
  },

  logWorkout: async (data: LogWorkoutInput): Promise<{ logId: string }> => {
    const res = await api.post<ApiSuccessResponse<{ logId: string }>>('/trainee/workouts/log', data);
    return res.data.data;
  },

  getWorkoutHistory: async (
    query: WorkoutHistoryQuery = {}
  ): Promise<PaginatedResponse<WorkoutHistorySummary>> => {
    const res = await api.get<ApiSuccessResponse<PaginatedResponse<WorkoutHistorySummary>>>(
      '/trainee/workouts/history',
      { params: query }
    );
    return res.data.data;
  },

  getWorkoutDetail: async (id: string): Promise<WorkoutLogDetail> => {
    const res = await api.get<ApiSuccessResponse<WorkoutLogDetail>>(`/trainee/workouts/${id}`);
    return res.data.data;
  },

  logMetric: async (data: LogMetricInput): Promise<{ id: string }> => {
    const res = await api.post<ApiSuccessResponse<{ id: string }>>('/trainee/metrics', data);
    return res.data.data;
  },

  getMetricsProgress: async (): Promise<MetricsProgressResponse> => {
    const res = await api.get<ApiSuccessResponse<MetricsProgressResponse>>('/trainee/metrics/progress');
    return res.data.data;
  },

  createSelfProgram: async (
    data: import('@/utils/pt-validation').CreateProgramFormData
  ): Promise<{ programId: string }> => {
    const res = await api.post<ApiSuccessResponse<{ programId: string }>>('/trainee/self-programs', data);
    return res.data.data;
  },

  createSelfSession: async (
    programId: string,
    data: import('@/utils/pt-validation').CreateSessionFormData
  ): Promise<{ sessionId: string }> => {
    const res = await api.post<ApiSuccessResponse<{ sessionId: string }>>(
      `/trainee/self-programs/${programId}/sessions`,
      data
    );
    return res.data.data;
  },

  addSelfExercises: async (
    programId: string,
    sessionId: string,
    data: { blocks: import('@/utils/pt-validation').AddExercisesFormData['blocks'] }
  ): Promise<void> => {
    await api.post(`/trainee/self-programs/${programId}/sessions/${sessionId}/exercises`, data);
  },

  scheduleSelfSession: async (
    programId: string,
    sessionId: string,
    dates: string[]
  ): Promise<{ createdSessionIds: string[] }> => {
    const res = await api.post<ApiSuccessResponse<{ createdSessionIds: string[] }>>(
      `/trainee/self-programs/${programId}/sessions/${sessionId}/schedule`,
      { dates }
    );
    return res.data.data;
  },
};
