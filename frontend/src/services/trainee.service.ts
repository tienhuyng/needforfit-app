import { ApiSuccessResponse } from '@/types/auth';
import { api, getApiErrorMessage } from '@/services/auth.service';
import {
  LogMetricInput,
  LogWorkoutInput,
  MetricsProgressResponse,
  PaginatedResponse,
  ProgramOption,
  SessionDetailResponse,
  TraineeHomeResponse,
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

  getPrograms: async (): Promise<ProgramOption[]> => {
    const res = await api.get<ApiSuccessResponse<ProgramOption[]>>('/trainee/programs');
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
};
