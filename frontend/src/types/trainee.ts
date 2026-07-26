export interface TraineeHomeResponse {
  todayWorkout: TodayWorkoutWidget | null;
  upcomingWorkouts: UpcomingWorkoutItem[];
  recentHistory: WorkoutHistorySummary[];
  weightTrend: WeightTrendPoint[];
  activePrograms: ActiveProgramItem[];
}

export interface TodayWorkoutWidget {
  sessionId: string;
  programId: string;
  programName: string;
  sessionName: string;
  scheduledDate: string;
  exerciseCount: number;
  canLog: boolean;
  isLocked: boolean;
  existingLogId: string | null;
}

export interface UpcomingWorkoutItem {
  sessionId: string;
  programId: string;
  programName: string;
  sessionName: string;
  scheduledDate: string;
  exerciseCount: number;
}

export interface WorkoutHistorySummary {
  id: string;
  workoutDate: string;
  programName: string;
  sessionName: string;
  exerciseCount: number;
  difficultyRating: number | null;
  status: string;
}

export interface WeightTrendPoint {
  date: string;
  weightKg: number;
}

export interface ActiveProgramItem {
  id: string;
  name: string;
  programType: string;
  status: string;
  sessionCount: number;
}

export interface SessionDetailResponse {
  sessionId: string;
  programId: string;
  programName: string;
  sessionName: string;
  scheduledDate: string;
  sessionType: string;
  canLog: boolean;
  isLocked: boolean;
  existingLogId: string | null;
  exercises: SessionExerciseItem[];
}

export interface SessionExerciseItem {
  id: string;
  exerciseName: string;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface WorkoutLogDetail {
  id: string;
  workoutDate: string;
  status: string;
  isLocked: boolean;
  programName: string;
  sessionName: string;
  scheduledDate: string;
  exercises: WorkoutLogExerciseItem[];
  feedback: WorkoutLogFeedbackItem | null;
}

export interface WorkoutLogExerciseItem {
  exerciseName: string;
  actualSets: number | null;
  actualReps: number | null;
  actualWeightKg: number | null;
  notes: string | null;
}

export interface WorkoutLogFeedbackItem {
  difficultyRating: number;
  fatigueRating: number;
  painOrDiscomfort: boolean;
  templateResponses: { q1: string; q2: string; q3: string } | null;
  traineeNotes: string | null;
}

export interface MetricsProgressResponse {
  stats: {
    latestWeight: number | null;
    startWeight: number | null;
    changeKg: number | null;
    entryCount: number;
  };
  chartData: WeightTrendPoint[];
  entries: BodyMetricEntry[];
}

export interface BodyMetricEntry {
  id: string;
  measurementDate: string;
  weightKg: number;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  notes: string | null;
  status: string;
  isLocked: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProgramOption {
  id: string;
  name: string;
  status: string;
  programType: string;
}

export interface LogWorkoutInput {
  sessionId: string;
  exercises: {
    exerciseName: string;
    actualSets?: number;
    actualReps?: number;
    actualWeightKg?: number;
    notes?: string;
  }[];
  feedback: {
    difficultyRating: number;
    fatigueRating: number;
    painOrDiscomfort: boolean;
    templateResponses: { q1: string; q2: string; q3: string };
    traineeNotes?: string;
  };
}

export interface LogMetricInput {
  measurementDate: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  notes?: string;
}

export interface WorkoutHistoryQuery {
  programId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
