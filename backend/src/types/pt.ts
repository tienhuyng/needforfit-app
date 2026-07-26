import { AssignmentStatus, ProgramStatus, ProgramType, SessionType, TraineeGoal } from '@prisma/client';

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
  type: 'workout_log' | 'program_created' | 'assignment';
  title: string;
  subtitle: string;
  occurredAt: string;
}

export interface PtDashboardResponse {
  kpis: PtDashboardKpis;
  trainees: PtDashboardTraineeRow[];
  recentActivity: PtActivityItem[];
}

export interface TraineeListItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  age: number | null;
  goal: TraineeGoal | null;
  status: AssignmentStatus;
  activePrograms: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
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

export interface SessionSummary {
  id: string;
  name: string;
  sessionType: SessionType;
  scheduledDate: string;
  estimatedDurationMinutes: number | null;
  status: string;
  exerciseCount: number;
}

export interface ExerciseSummary {
  id: string;
  exerciseName: string;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
}
