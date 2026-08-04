import type { ApiSuccessResponse } from './auth';

export type TraineeGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'improve_health'
  | 'increase_strength'
  | 'improve_posture';

export type AssignmentStatus =
  | 'active'
  | 'paused'
  | 'ended'
  | 'invite_pending'
  | 'invite_rejected';

export type ProgramType = 'strength' | 'cardio' | 'flexibility' | 'mixed';

export type ProgramStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type SessionType = 'strength' | 'cardio' | 'flexibility';

export type SessionStatus = 'draft' | 'active' | 'paused' | 'completed';

export type PtActivityType = 'workout_log' | 'program_created' | 'assignment';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PtDashboardKpis {
  trainees: number;
  programs: number;
  workoutsThisWeek: number;
}

export interface PtDashboardTraineeRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  age: number | null;
  goal: TraineeGoal | null;
  status: AssignmentStatus;
}

export interface PtActivityItem {
  id: string;
  type: PtActivityType;
  title: string;
  subtitle: string;
  occurredAt: string;
}

export interface PtDashboardResponse {
  kpis: PtDashboardKpis;
  trainees: PtDashboardTraineeRow[];
  recentActivity: PtActivityItem[];
}

export interface TraineeListQuery {
  search?: string;
  status?: AssignmentStatus;
  page?: number;
  limit?: number;
}

export interface TraineeListItem {
  assignmentId: string;
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  age: number | null;
  goal: TraineeGoal | null;
  status: AssignmentStatus;
  activePrograms: number;
}

export interface TraineeProgramSummary {
  id: string;
  name: string;
  status: ProgramStatus;
  programType: ProgramType;
  assignedAt: string;
}

export interface TraineeWorkoutHistoryItem {
  id: string;
  sessionName: string;
  programName: string;
  workoutDate: string;
  completionPercent: number;
  difficultyRating: number | null;
}

export interface TraineeMetricItem {
  id: string;
  measurementDate: string;
  weightKg: number;
  bodyFatPercent: number | null;
}

export interface TraineeDetailResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  age: number | null;
  goal: TraineeGoal | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  injuryHistory: string | null;
  assignmentStatus: AssignmentStatus;
  programs: TraineeProgramSummary[];
  workoutHistory: TraineeWorkoutHistoryItem[];
  metrics: TraineeMetricItem[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  objective: string | null;
  programType: ProgramType;
  durationWeeks: number | null;
  status: ProgramStatus;
  sessionCount: number;
  createdAt: string;
}

export interface AssignedTraineeSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  assignedAt: string;
}

export interface ProgramDetailResponse extends ProgramSummary {
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  sessions: SessionSummary[];
  assignedTrainees: AssignedTraineeSummary[];
}

export interface SessionDetailResponse extends SessionSummary {
  notes: string | null;
  sessionVersion: number;
  exercises: WorkoutSessionExercise[];
}

export interface AssignProgramInput {
  traineeId: string;
}

export type UpdateProgramInput = Partial<CreateProgramInput>;

export type UpdateSessionInput = Partial<CreateSessionInput> & {
  status?: SessionStatus;
};

export interface TrainingProgram {
  id: string;
  ptId: string;
  name: string;
  objective: string | null;
  programType: ProgramType;
  durationWeeks: number | null;
  status: ProgramStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgramInput {
  name: string;
  objective?: string;
  programType: ProgramType;
  durationWeeks?: number;
  notes?: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  sessionType: SessionType;
  scheduledDate: string;
  estimatedDurationMinutes: number | null;
  status: SessionStatus;
  exerciseCount: number;
}

export interface WorkoutSession {
  id: string;
  programId: string;
  name: string;
  sessionType: SessionType;
  scheduledDate: string;
  estimatedDurationMinutes: number | null;
  notes: string | null;
  status: SessionStatus;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  name: string;
  sessionType: SessionType;
  scheduledDate: string;
  estimatedDurationMinutes?: number;
  notes?: string;
}

export interface WorkoutSessionExercise {
  id: string;
  sessionId?: string;
  exerciseName: string;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | string | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
  blockIndex?: number;
  blockType?: 'normal' | 'superset' | 'dropset';
  sessionVersion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseItemInput {
  exerciseName: string;
  plannedSets?: number;
  plannedReps?: number;
  plannedWeightKg?: number;
  restSeconds?: number;
  notes?: string;
}

export interface ExerciseBlockInput {
  blockType: 'normal' | 'superset' | 'dropset';
  exercises: ExerciseItemInput[];
}

export interface AddExercisesInput {
  exercises?: ExerciseItemInput[];
  blocks?: ExerciseBlockInput[];
}

export interface AddExercisesResponse {
  exercises: WorkoutSessionExercise[];
}

export type PtDashboardApiResponse = ApiSuccessResponse<PtDashboardResponse>;
export type TraineeListApiResponse = ApiSuccessResponse<PaginatedResponse<TraineeListItem>>;
export type TraineeDetailApiResponse = ApiSuccessResponse<TraineeDetailResponse>;
export type ProgramListApiResponse = ApiSuccessResponse<ProgramSummary[]>;
export type CreateProgramApiResponse = ApiSuccessResponse<TrainingProgram>;
export type SessionListApiResponse = ApiSuccessResponse<SessionSummary[]>;
export type CreateSessionApiResponse = ApiSuccessResponse<WorkoutSession>;
export type AddExercisesApiResponse = ApiSuccessResponse<AddExercisesResponse>;
