import {
  AssignmentStatus,
  BodyMetricStatus,
  Prisma,
  ProgramStatus,
  SessionStatus,
  WorkoutLogStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { SupportedLanguage, t } from '../config/i18n';
import { AppError } from '../utils/errors';
import { TRAINEE_ERROR_CODES, TRAINEE_I18N_KEYS } from '../types/trainee.errors';
import {
  isFutureDate,
  isWithinLogWindow,
  shouldLockLog,
  startOfDay,
} from '../utils/workout-window';
import {
  LogMetricInput,
  LogWorkoutInput,
  MetricsHistoryQuery,
  WorkoutHistoryQuery,
} from '../validators/trainee.validator';
import { getCurrentVersionExercises } from '../utils/session-exercises';
import { parseSetDetails, totalVolumeKg } from '../utils/workout-volume';
import { createUserNotification, formatUserName } from '../utils/user-notifications';
import {
  ActiveProgramItem,
  BodyMetricEntry,
  MetricsProgressResponse,
  PaginatedResponse,
  SessionDetailResponse,
  TraineeHomeResponse,
  TraineeProgramItem,
  TraineeProgramSessionItem,
  TraineePtInviteItem,
  UpcomingWorkoutItem,
  WeightTrendPoint,
  WorkoutHistorySummary,
  WorkoutLogDetail,
} from '../types/trainee';

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getAssignedProgramIds(traineeId: string): Promise<string[]> {
  const assignments = await prisma.programTraineeAssignment.findMany({
    where: { traineeId },
    select: { programId: true },
  });
  return assignments.map((a) => a.programId);
}

async function assertSessionAccessible(
  traineeId: string,
  sessionId: string
): Promise<{
  session: Prisma.WorkoutSessionGetPayload<{
    include: { program: true; exercises: true; logs: true };
  }>;
}> {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      program: true,
      exercises: { orderBy: { orderIndex: 'asc' } },
      logs: { where: { traineeId } },
    },
  });

  if (!session) {
    throw new AppError(
      TRAINEE_ERROR_CODES.SESSION_NOT_FOUND,
      TRAINEE_I18N_KEYS.sessionNotFound,
      404
    );
  }

  const assignment = await prisma.programTraineeAssignment.findUnique({
    where: {
      programId_traineeId: { programId: session.programId, traineeId },
    },
  });

  if (!assignment) {
    throw new AppError(
      TRAINEE_ERROR_CODES.SESSION_NOT_ACCESSIBLE,
      TRAINEE_I18N_KEYS.sessionNotAccessible,
      403
    );
  }

  return { session };
}

async function lockExpiredLogs(traineeId: string): Promise<void> {
  const logs = await prisma.workoutLog.findMany({
    where: { traineeId, status: WorkoutLogStatus.completed },
    include: { session: true },
  });

  const now = new Date();
  for (const log of logs) {
    if (shouldLockLog(log.session.scheduledDate, now)) {
      await prisma.workoutLog.update({
        where: { id: log.id },
        data: { status: WorkoutLogStatus.locked, lockedAt: now },
      });
    }
  }
}

async function lockExpiredMetrics(traineeId: string): Promise<void> {
  const metrics = await prisma.bodyMeasurementLog.findMany({
    where: { traineeId, status: BodyMetricStatus.completed },
  });

  const now = new Date();
  for (const metric of metrics) {
    const deadline = new Date(metric.measurementDate);
    deadline.setHours(deadline.getHours() + 24);
    if (now > deadline) {
      await prisma.bodyMeasurementLog.update({
        where: { id: metric.id },
        data: { status: BodyMetricStatus.locked, lockedAt: now },
      });
    }
  }
}

export class TraineeService {
  async getHome(traineeId: string): Promise<TraineeHomeResponse> {
    await lockExpiredLogs(traineeId);
    await lockExpiredMetrics(traineeId);

    const programIds = await getAssignedProgramIds(traineeId);
    const today = startOfDay(new Date());
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [sessions, recentLogs, weightLogs, programs, pendingInvites] = await Promise.all([
      programIds.length
        ? prisma.workoutSession.findMany({
            where: {
              programId: { in: programIds },
              status: { in: [SessionStatus.active, SessionStatus.completed] },
              scheduledDate: { gte: today, lte: weekAhead },
            },
            include: {
              program: true,
              exercises: true,
              logs: { where: { traineeId } },
            },
            orderBy: { scheduledDate: 'asc' },
            take: 10,
          })
        : Promise.resolve([]),
      prisma.workoutLog.findMany({
        where: { traineeId },
        include: {
          session: { include: { program: true } },
          feedback: true,
          exercises: true,
        },
        orderBy: { workoutDate: 'desc' },
        take: 5,
      }),
      prisma.bodyMeasurementLog.findMany({
        where: { traineeId },
        orderBy: { measurementDate: 'desc' },
        take: 14,
      }),
      programIds.length
        ? prisma.trainingProgram.findMany({
            where: {
              id: { in: programIds },
              status: { in: [ProgramStatus.active] },
            },
            include: { _count: { select: { sessions: true } } },
          })
        : Promise.resolve([]),
      prisma.ptTraineeAssignment.findMany({
        where: { traineeId, status: AssignmentStatus.invite_pending },
        include: { pt: true },
        orderBy: { assignedAt: 'desc' },
      }),
    ]);

    const todaySessions = sessions.filter((s) => startOfDay(s.scheduledDate).getTime() === today.getTime());
    const todaySession = todaySessions[0] ?? null;

    const todayWorkout = todaySession
      ? this.mapTodayWorkout(todaySession)
      : null;

    const upcomingWorkouts: UpcomingWorkoutItem[] = sessions
      .filter((s) => s.id !== todaySession?.id)
      .slice(0, 5)
      .map((s) => ({
        sessionId: s.id,
        programId: s.programId,
        programName: s.program.name,
        sessionName: s.name,
        scheduledDate: formatDate(s.scheduledDate),
        exerciseCount: s.exercises.length,
      }));

    const recentHistory: WorkoutHistorySummary[] = recentLogs.map((log) =>
      this.mapWorkoutHistorySummary(log)
    );

    const weightTrend: WeightTrendPoint[] = weightLogs
      .slice()
      .reverse()
      .map((m) => ({
        date: formatDate(m.measurementDate),
        weightKg: Number(m.weightKg),
      }));

    const activePrograms: ActiveProgramItem[] = programs.map((p) => ({
      id: p.id,
      name: p.name,
      programType: p.programType,
      status: p.status,
      sessionCount: p._count.sessions,
    }));

    const ptInvites: TraineePtInviteItem[] = pendingInvites.map((invite) => ({
      assignmentId: invite.id,
      ptId: invite.ptId,
      ptName: formatUserName(invite.pt.firstName, invite.pt.lastName, invite.pt.email),
      ptEmail: invite.pt.email,
      invitedAt: invite.assignedAt.toISOString(),
    }));

    return {
      todayWorkout,
      upcomingWorkouts,
      recentHistory,
      weightTrend,
      activePrograms,
      ptInvites,
    };
  }

  async respondToPtInvite(
    traineeId: string,
    assignmentId: string,
    accept: boolean,
    lng: SupportedLanguage
  ) {
    const assignment = await prisma.ptTraineeAssignment.findFirst({
      where: {
        id: assignmentId,
        traineeId,
        status: AssignmentStatus.invite_pending,
      },
      include: { pt: true, trainee: true },
    });

    if (!assignment) {
      throw new AppError(TRAINEE_ERROR_CODES.NOT_FOUND, TRAINEE_I18N_KEYS.inviteNotFound, 404);
    }

    const traineeName = formatUserName(
      assignment.trainee.firstName,
      assignment.trainee.lastName,
      assignment.trainee.email
    );

    if (accept) {
      await prisma.ptTraineeAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.active },
      });
      await createUserNotification(
        assignment.ptId,
        'invite_accepted',
        'Trainee accepted invitation',
        `${traineeName} accepted your training invitation.`,
        { assignmentId: assignment.id, traineeId }
      );
      return { status: AssignmentStatus.active, message: t(TRAINEE_I18N_KEYS.inviteAccepted, lng) };
    }

    await prisma.ptTraineeAssignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.invite_rejected },
    });
    await createUserNotification(
      assignment.ptId,
      'invite_rejected',
      'Trainee declined invitation',
      `${traineeName} declined your training invitation.`,
      { assignmentId: assignment.id, traineeId }
    );
    return {
      status: AssignmentStatus.invite_rejected,
      message: t(TRAINEE_I18N_KEYS.inviteRejected, lng),
    };
  }

  private mapWorkoutHistorySummary(
    log: Prisma.WorkoutLogGetPayload<{
      include: { session: { include: { program: true } }; feedback: true; exercises: true };
    }>
  ): WorkoutHistorySummary {
    const templateResponses = log.feedback?.templateResponses as { q1?: string } | null;
    return {
      id: log.id,
      workoutDate: formatDate(log.workoutDate),
      programName: log.session.program.name,
      sessionName: log.session.name,
      exerciseCount: log.exercises.length,
      feedbackSummary: templateResponses?.q1?.trim() ? templateResponses.q1 : null,
      difficultyRating: log.feedback?.difficultyRating ?? null,
      status: log.status,
    };
  }

  private normalizeLoggedExercise(e: LogWorkoutInput['exercises'][number]) {
    const setEntries = e.setEntries ?? [];
    const setDetails =
      setEntries.length > 0
        ? setEntries.map((s) => ({
            reps: s.reps,
            weightKg: s.weightKg,
          }))
        : undefined;
    const actualSets = setEntries.length > 0 ? setEntries.length : e.actualSets;
    const repsWithValues = setEntries.filter((s) => s.reps != null).map((s) => s.reps!);
    const actualReps =
      repsWithValues.length > 0
        ? Math.round(repsWithValues.reduce((a, b) => a + b, 0) / repsWithValues.length)
        : e.actualReps;
    const weights = setEntries.filter((s) => s.weightKg != null).map((s) => s.weightKg!);
    const actualWeightKg =
      weights.length > 0
        ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
        : e.actualWeightKg;

    return {
      exerciseName: e.exerciseName,
      actualSets,
      actualReps,
      actualWeightKg,
      setDetails,
      notes: e.notes,
    };
  }

  private mapTodayWorkout(
    session: Prisma.WorkoutSessionGetPayload<{
      include: { program: true; exercises: true; logs: true };
    }>
  ) {
    const existingLog = session.logs[0] ?? null;
    const canLog =
      !existingLog &&
      isWithinLogWindow(session.scheduledDate) &&
      session.exercises.length > 0;
    const isLocked =
      existingLog?.status === WorkoutLogStatus.locked ||
      shouldLockLog(session.scheduledDate);

    return {
      sessionId: session.id,
      programId: session.programId,
      programName: session.program.name,
      sessionName: session.name,
      scheduledDate: formatDate(session.scheduledDate),
      exerciseCount: session.exercises.length,
      canLog,
      isLocked,
      existingLogId: existingLog?.id ?? null,
    };
  }

  async getSessionDetail(traineeId: string, sessionId: string): Promise<SessionDetailResponse> {
    await lockExpiredLogs(traineeId);
    const { session } = await assertSessionAccessible(traineeId, sessionId);
    const existingLog = session.logs[0] ?? null;
    const currentExercises = getCurrentVersionExercises(session.sessionVersion, session.exercises);
    const canLog =
      !existingLog &&
      isWithinLogWindow(session.scheduledDate) &&
      currentExercises.length > 0;

    return {
      sessionId: session.id,
      programId: session.programId,
      programName: session.program.name,
      sessionName: session.name,
      scheduledDate: formatDate(session.scheduledDate),
      sessionType: session.sessionType,
      canLog,
      isLocked:
        existingLog?.status === WorkoutLogStatus.locked ||
        shouldLockLog(session.scheduledDate),
      existingLogId: existingLog?.id ?? null,
      exercises: currentExercises.map((e) => ({
        id: e.id,
        exerciseName: e.exerciseName,
        plannedSets: e.plannedSets,
        plannedReps: e.plannedReps,
        plannedWeightKg: decimalToNumber(e.plannedWeightKg),
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
    };
  }

  async logWorkout(
    traineeId: string,
    input: LogWorkoutInput,
    language: SupportedLanguage
  ): Promise<{ logId: string; message: string }> {
    const { session } = await assertSessionAccessible(traineeId, input.sessionId);

    if (session.logs.length > 0) {
      throw new AppError(
        TRAINEE_ERROR_CODES.ALREADY_LOGGED,
        TRAINEE_I18N_KEYS.alreadyLogged,
        409
      );
    }

    if (!isWithinLogWindow(session.scheduledDate)) {
      throw new AppError(
        TRAINEE_ERROR_CODES.OUTSIDE_LOG_WINDOW,
        TRAINEE_I18N_KEYS.outsideLogWindow,
        403
      );
    }

    if (session.exercises.length === 0) {
      throw new AppError(
        TRAINEE_ERROR_CODES.SESSION_NOT_FOUND,
        TRAINEE_I18N_KEYS.sessionNotFound,
        400
      );
    }

    const log = await prisma.workoutLog.create({
      data: {
        sessionId: session.id,
        traineeId,
        ptId: session.program.ptId,
        workoutDate: session.scheduledDate,
        status: WorkoutLogStatus.completed,
        exercises: {
          create: input.exercises.map((e) => {
            const normalized = this.normalizeLoggedExercise(e);
            return {
              exerciseName: normalized.exerciseName,
              actualSets: normalized.actualSets,
              actualReps: normalized.actualReps,
              actualWeightKg: normalized.actualWeightKg,
              setDetails: normalized.setDetails,
              notes: normalized.notes,
            };
          }),
        },
        feedback: {
          create: {
            difficultyRating: input.feedback.difficultyRating,
            fatigueRating: input.feedback.fatigueRating,
            painOrDiscomfort: input.feedback.painOrDiscomfort,
            templateResponses: input.feedback.templateResponses,
            traineeNotes: input.feedback.traineeNotes,
          },
        },
      },
    });

    return {
      logId: log.id,
      message: t(TRAINEE_I18N_KEYS.logSuccess, language),
    };
  }

  async getWorkoutHistory(
    traineeId: string,
    query: WorkoutHistoryQuery
  ): Promise<PaginatedResponse<WorkoutHistorySummary>> {
    await lockExpiredLogs(traineeId);

    const where: Prisma.WorkoutLogWhereInput = { traineeId };

    if (query.programId) {
      where.session = { programId: query.programId };
    }
    if (query.fromDate || query.toDate) {
      where.workoutDate = {};
      if (query.fromDate) where.workoutDate.gte = new Date(query.fromDate);
      if (query.toDate) where.workoutDate.lte = new Date(query.toDate);
    }

    const skip = (query.page - 1) * query.limit;
    const [total, logs] = await Promise.all([
      prisma.workoutLog.count({ where }),
      prisma.workoutLog.findMany({
        where,
        include: {
          session: { include: { program: true } },
          feedback: true,
          exercises: true,
        },
        orderBy: { workoutDate: 'desc' },
        skip,
        take: query.limit,
      }),
    ]);

    return {
      items: logs.map((log) => this.mapWorkoutHistorySummary(log)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  async getWorkoutDetail(traineeId: string, logId: string): Promise<WorkoutLogDetail> {
    await lockExpiredLogs(traineeId);

    const log = await prisma.workoutLog.findFirst({
      where: { id: logId, traineeId },
      include: {
        session: { include: { program: true } },
        exercises: true,
        feedback: true,
      },
    });

    if (!log) {
      throw new AppError(TRAINEE_ERROR_CODES.NOT_FOUND, TRAINEE_I18N_KEYS.notFound, 404);
    }

    const templateResponses = log.feedback?.templateResponses as
      | { q1: string; q2: string; q3: string }
      | null;

    const exercises = log.exercises.map((e) => ({
      exerciseName: e.exerciseName,
      actualSets: e.actualSets,
      actualReps: e.actualReps,
      actualWeightKg: decimalToNumber(e.actualWeightKg),
      setDetails: parseSetDetails(e.setDetails),
      notes: e.notes,
    }));

    return {
      id: log.id,
      workoutDate: formatDate(log.workoutDate),
      status: log.status,
      isLocked: log.status === WorkoutLogStatus.locked,
      programName: log.session.program.name,
      sessionName: log.session.name,
      scheduledDate: formatDate(log.session.scheduledDate),
      totalVolumeKg: totalVolumeKg(exercises),
      exercises,
      feedback: log.feedback
        ? {
            difficultyRating: log.feedback.difficultyRating,
            fatigueRating: log.feedback.fatigueRating,
            painOrDiscomfort: log.feedback.painOrDiscomfort,
            templateResponses,
            traineeNotes: log.feedback.traineeNotes,
          }
        : null,
    };
  }

  async logMetric(
    traineeId: string,
    input: LogMetricInput,
    language: SupportedLanguage
  ): Promise<{ id: string; message: string }> {
    const measurementDate = new Date(input.measurementDate);
    if (isFutureDate(measurementDate)) {
      throw new AppError(TRAINEE_ERROR_CODES.FUTURE_DATE, TRAINEE_I18N_KEYS.futureDate, 400);
    }

    const metric = await prisma.bodyMeasurementLog.create({
      data: {
        traineeId,
        measurementDate,
        weightKg: input.weightKg,
        bodyFatPercent: input.bodyFatPercent,
        muscleMassKg: input.muscleMassKg,
        notes: input.notes,
        status: BodyMetricStatus.completed,
      },
    });

    await prisma.traineeProfile.updateMany({
      where: { userId: traineeId },
      data: { currentWeightKg: input.weightKg },
    });

    return {
      id: metric.id,
      message: t(TRAINEE_I18N_KEYS.metricSuccess, language),
    };
  }

  async getMetricsHistory(
    traineeId: string,
    query: MetricsHistoryQuery
  ): Promise<PaginatedResponse<BodyMetricEntry>> {
    await lockExpiredMetrics(traineeId);

    const where: Prisma.BodyMeasurementLogWhereInput = { traineeId };
    if (query.fromDate || query.toDate) {
      where.measurementDate = {};
      if (query.fromDate) where.measurementDate.gte = new Date(query.fromDate);
      if (query.toDate) where.measurementDate.lte = new Date(query.toDate);
    }

    const skip = (query.page - 1) * query.limit;
    const [total, entries] = await Promise.all([
      prisma.bodyMeasurementLog.count({ where }),
      prisma.bodyMeasurementLog.findMany({
        where,
        orderBy: { measurementDate: 'desc' },
        skip,
        take: query.limit,
      }),
    ]);

    return {
      items: entries.map((e) => ({
        id: e.id,
        measurementDate: formatDate(e.measurementDate),
        weightKg: Number(e.weightKg),
        bodyFatPercent: decimalToNumber(e.bodyFatPercent),
        muscleMassKg: decimalToNumber(e.muscleMassKg),
        notes: e.notes,
        status: e.status,
        isLocked: e.status === BodyMetricStatus.locked,
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  async getMetricsProgress(traineeId: string): Promise<MetricsProgressResponse> {
    await lockExpiredMetrics(traineeId);

    const entries = await prisma.bodyMeasurementLog.findMany({
      where: { traineeId },
      orderBy: { measurementDate: 'asc' },
    });

    const chartData: WeightTrendPoint[] = entries.map((e) => ({
      date: formatDate(e.measurementDate),
      weightKg: Number(e.weightKg),
    }));

    const latestWeight = entries.length ? Number(entries[entries.length - 1].weightKg) : null;
    const startWeight = entries.length ? Number(entries[0].weightKg) : null;
    const changeKg =
      latestWeight != null && startWeight != null ? latestWeight - startWeight : null;

    return {
      stats: {
        latestWeight,
        startWeight,
        changeKg,
        entryCount: entries.length,
      },
      chartData,
      entries: entries
        .slice()
        .reverse()
        .map((e) => ({
          id: e.id,
          measurementDate: formatDate(e.measurementDate),
          weightKg: Number(e.weightKg),
          bodyFatPercent: decimalToNumber(e.bodyFatPercent),
          muscleMassKg: decimalToNumber(e.muscleMassKg),
          notes: e.notes,
          status: e.status,
          isLocked: e.status === BodyMetricStatus.locked,
        })),
    };
  }

  async listPrograms(traineeId: string): Promise<TraineeProgramItem[]> {
    const assignments = await prisma.programTraineeAssignment.findMany({
      where: {
        traineeId,
        program: { status: { in: [ProgramStatus.active, ProgramStatus.paused, ProgramStatus.completed] } },
      },
      include: {
        program: {
          include: {
            pt: { select: { firstName: true, lastName: true, email: true } },
            sessions: { select: { id: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const programIds = assignments.map((a) => a.programId);
    const completedCounts = programIds.length
      ? await prisma.workoutLog.groupBy({
          by: ['sessionId'],
          where: { traineeId, session: { programId: { in: programIds } } },
        })
      : [];

    const completedSessionIds = new Set(completedCounts.map((c) => c.sessionId));

    return assignments.map((a) => {
      const sessionCount = a.program.sessions.length;
      const completedCount = a.program.sessions.filter((s) =>
        completedSessionIds.has(s.id)
      ).length;
      const pt = a.program.pt;
      const ptName =
        [pt.firstName, pt.lastName].filter(Boolean).join(' ') || pt.email;

      return {
        id: a.program.id,
        name: a.program.name,
        programType: a.program.programType,
        status: a.program.status,
        ptName,
        sessionCount,
        completedCount,
        progressPercent:
          sessionCount > 0 ? Math.round((completedCount / sessionCount) * 100) : 0,
      };
    });
  }

  async getProgramSessions(
    traineeId: string,
    programId: string
  ): Promise<TraineeProgramSessionItem[]> {
    const assignment = await prisma.programTraineeAssignment.findUnique({
      where: { programId_traineeId: { programId, traineeId } },
    });

    if (!assignment) {
      throw new AppError(
        TRAINEE_ERROR_CODES.SESSION_NOT_ACCESSIBLE,
        TRAINEE_I18N_KEYS.sessionNotAccessible,
        403
      );
    }

    await lockExpiredLogs(traineeId);

    const sessions = await prisma.workoutSession.findMany({
      where: {
        programId,
        status: { in: [SessionStatus.active, SessionStatus.completed] },
      },
      include: {
        exercises: true,
        logs: { where: { traineeId } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return sessions.map((session) => {
      const currentExercises = getCurrentVersionExercises(
        session.sessionVersion,
        session.exercises
      );
      const existingLog = session.logs[0] ?? null;
      const canLog =
        !existingLog &&
        isWithinLogWindow(session.scheduledDate) &&
        currentExercises.length > 0;

      return {
        sessionId: session.id,
        sessionName: session.name,
        scheduledDate: formatDate(session.scheduledDate),
        sessionType: session.sessionType,
        exerciseCount: currentExercises.length,
        canLog,
        isLocked:
          existingLog?.status === WorkoutLogStatus.locked ||
          shouldLockLog(session.scheduledDate),
        existingLogId: existingLog?.id ?? null,
        isCompleted: !!existingLog,
      };
    });
  }

  async getProgramSessionDetail(
    traineeId: string,
    programId: string,
    sessionId: string
  ): Promise<SessionDetailResponse> {
    const assignment = await prisma.programTraineeAssignment.findUnique({
      where: { programId_traineeId: { programId, traineeId } },
    });

    if (!assignment) {
      throw new AppError(
        TRAINEE_ERROR_CODES.SESSION_NOT_ACCESSIBLE,
        TRAINEE_I18N_KEYS.sessionNotAccessible,
        403
      );
    }

    return this.getSessionDetail(traineeId, sessionId);
  }
}

export const traineeService = new TraineeService();
