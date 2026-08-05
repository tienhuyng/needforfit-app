export interface TraineeHomeResponse {
  todayWorkout: TodayWorkoutWidget | null;
  upcomingWorkouts: UpcomingWorkoutItem[];
  recentHistory: WorkoutHistorySummary[];
  weightTrend: WeightTrendPoint[];
  activePrograms: ActiveProgramItem[];
  ptInvites: TraineePtInviteItem[];
}

export interface TraineePtInviteItem {
  assignmentId: string;
  ptId: string;
  ptName: string;
  ptEmail: string;
  invitedAt: string;
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
  feedbackSummary: string | null;
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

export interface TraineeProgramItem {
  id: string;
  name: string;
  programType: string;
  status: string;
  ptName: string;
  progressPercent: number;
  sessionCount: number;
  completedCount: number;
}

export interface TraineeProgramSessionItem {
  sessionId: string;
  sessionName: string;
  scheduledDate: string;
  sessionType: string;
  exerciseCount: number;
  canLog: boolean;
  isLocked: boolean;
  existingLogId: string | null;
  isCompleted: boolean;
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
  totalVolumeKg: number;
  exercises: WorkoutLogExerciseItem[];
  feedback: WorkoutLogFeedbackItem | null;
}

export interface WorkoutLogExerciseItem {
  exerciseName: string;
  actualSets: number | null;
  actualReps: number | null;
  actualWeightKg: number | null;
  setDetails: { reps?: number; weightKg?: number }[] | null;
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
