import {
  AssignmentStatus,
  ExerciseBlockType,
  Prisma,
  ProgramStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { SupportedLanguage, t } from '../config/i18n';
import { AppError } from '../utils/errors';
import { PT_ERROR_CODES, PT_I18N_KEYS } from '../types/pt.errors';
import {
  AddExercisesInput,
  AssignProgramInput,
  CreateProgramInput,
  CreateSessionInput,
  InviteTraineeInput,
  ScheduleSessionInput,
  TraineeListQuery,
  UpdateProgramInput,
  UpdateSessionInput,
} from '../validators/pt.validator';
import {
  AssignedTraineeSummary,
  ExerciseSummary,
  PaginatedResponse,
  ProgramDetailResponse,
  ProgramSummary,
  PtActivityItem,
  PtDashboardResponse,
  PtDashboardTraineeRow,
  SessionDetailResponse,
  SessionSummary,
  TraineeDetailResponse,
  TraineeListItem,
} from '../types/pt';
import { getCurrentVersionExercises } from '../utils/session-exercises';
import { hasScheduledDate } from '../utils/session-schedule';
import { createUserNotification, formatUserName } from '../utils/user-notifications';

type FlatExerciseInput = {
  exerciseName: string;
  plannedSets?: number;
  plannedReps?: number;
  plannedWeightKg?: number;
  restSeconds?: number;
  notes?: string;
  blockIndex: number;
  blockType: ExerciseBlockType;
};

function flattenExerciseInput(input: AddExercisesInput): FlatExerciseInput[] {
  if (input.blocks?.length) {
    const flat: FlatExerciseInput[] = [];
    input.blocks.forEach((block, blockIndex) => {
      block.exercises.forEach((exercise) => {
        flat.push({
          ...exercise,
          blockIndex,
          blockType: block.blockType as ExerciseBlockType,
        });
      });
    });
    return flat;
  }

  return (input.exercises ?? []).map((exercise) => ({
    ...exercise,
    blockIndex: 0,
    blockType: ExerciseBlockType.normal,
  }));
}

function calcAge(dateOfBirth: Date | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function assertTraineeAssigned(ptId: string, traineeId: string): Promise<void> {
  const assignment = await prisma.ptTraineeAssignment.findFirst({
    where: { ptId, traineeId, status: AssignmentStatus.active },
  });
  if (!assignment) {
    throw new AppError(
      PT_ERROR_CODES.TRAINEE_NOT_ASSIGNED,
      PT_I18N_KEYS.traineeNotAssigned,
      403
    );
  }
}

async function assertProgramOwned(ptId: string, programId: string) {
  const program = await prisma.trainingProgram.findFirst({
    where: { id: programId, ptId },
  });
  if (!program) {
    throw new AppError(PT_ERROR_CODES.PROGRAM_NOT_FOUND, PT_I18N_KEYS.programNotFound, 404);
  }
  return program;
}

export class PtService {
  async getDashboard(ptId: string): Promise<PtDashboardResponse> {
    const weekStart = startOfWeek();

    const [traineeCount, programCount, workoutsThisWeek, assignments, recentLogs, recentPrograms, recentNotifications] =
      await Promise.all([
        prisma.ptTraineeAssignment.count({
          where: { ptId, status: AssignmentStatus.active },
        }),
        prisma.trainingProgram.count({
          where: { ptId, status: { not: ProgramStatus.archived } },
        }),
        prisma.workoutLog.count({
          where: { ptId, createdAt: { gte: weekStart } },
        }),
        prisma.ptTraineeAssignment.findMany({
          where: { ptId, status: AssignmentStatus.active },
          include: {
            trainee: { include: { traineeProfile: true } },
          },
          orderBy: { assignedAt: 'desc' },
          take: 5,
        }),
        prisma.workoutLog.findMany({
          where: { ptId },
          include: {
            trainee: true,
            session: { include: { program: true } },
            feedback: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.trainingProgram.findMany({
          where: { ptId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        prisma.userNotification.findMany({
          where: { userId: ptId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const trainees: PtDashboardTraineeRow[] = assignments.map((a) => ({
      id: a.trainee.id,
      firstName: a.trainee.firstName,
      lastName: a.trainee.lastName,
      email: a.trainee.email,
      age: calcAge(a.trainee.traineeProfile?.dateOfBirth),
      goal: a.trainee.traineeProfile?.goal ?? null,
      status: a.status,
    }));

    const recentActivity: PtActivityItem[] = [
      ...recentLogs.map((log) => ({
        id: log.id,
        type: 'workout_log' as const,
        tag: 'workout_log',
        title: `${log.trainee.firstName ?? ''} ${log.trainee.lastName ?? ''}`.trim() || log.trainee.email,
        subtitle: `${log.session.name} · ${log.session.program.name}`,
        occurredAt: log.createdAt.toISOString(),
      })),
      ...recentPrograms.map((p) => ({
        id: p.id,
        type: 'program_created' as const,
        tag: 'program_created',
        title: p.name,
        subtitle: p.programType,
        occurredAt: p.createdAt.toISOString(),
      })),
      ...recentNotifications.map((n) => ({
        id: n.id,
        type: 'assignment' as const,
        tag: n.type === 'invite_accepted' ? 'invite_accepted' : n.type === 'invite_rejected' ? 'invite_rejected' : 'notification',
        title: n.title,
        subtitle: n.body,
        occurredAt: n.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 8);

    return {
      kpis: {
        trainees: traineeCount,
        programs: programCount,
        workoutsThisWeek,
      },
      trainees,
      recentActivity,
    };
  }

  async listTrainees(
    ptId: string,
    query: TraineeListQuery
  ): Promise<PaginatedResponse<TraineeListItem>> {
    const where: Prisma.PtTraineeAssignmentWhereInput = {
      ptId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            trainee: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.ptTraineeAssignment.count({ where }),
      prisma.ptTraineeAssignment.findMany({
        where,
        include: {
          trainee: { include: { traineeProfile: true } },
        },
        orderBy: { assignedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    const traineeIds = rows.map((r) => r.traineeId);
    const programCounts = traineeIds.length
      ? await prisma.programTraineeAssignment.groupBy({
          by: ['traineeId'],
          where: {
            traineeId: { in: traineeIds },
            program: { ptId, status: ProgramStatus.active },
          },
          _count: { _all: true },
        })
      : [];

    const countMap = new Map(programCounts.map((p) => [p.traineeId, p._count._all]));

    const items: TraineeListItem[] = rows.map((row) => ({
      assignmentId: row.id,
      id: row.trainee.id,
      firstName: row.trainee.firstName,
      lastName: row.trainee.lastName,
      email: row.trainee.email,
      age: calcAge(row.trainee.traineeProfile?.dateOfBirth),
      goal: row.trainee.traineeProfile?.goal ?? null,
      status: row.status,
      activePrograms: countMap.get(row.trainee.id) ?? 0,
    }));

    return { items, total, page: query.page, limit: query.limit };
  }

  async getTraineeDetail(ptId: string, traineeId: string): Promise<TraineeDetailResponse> {
    const assignment = await prisma.ptTraineeAssignment.findFirst({
      where: { ptId, traineeId },
      include: {
        trainee: { include: { traineeProfile: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (!assignment) {
      throw new AppError(
        PT_ERROR_CODES.TRAINEE_NOT_ASSIGNED,
        PT_I18N_KEYS.traineeNotAssigned,
        404
      );
    }

    const profile = assignment.trainee.traineeProfile;

    const [programs, logs, metrics] = await Promise.all([
      prisma.programTraineeAssignment.findMany({
        where: { traineeId, program: { ptId } },
        include: { program: true },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.workoutLog.findMany({
        where: { traineeId, ptId },
        include: {
          session: { include: { program: true, exercises: true } },
          feedback: true,
          exercises: true,
        },
        orderBy: { workoutDate: 'desc' },
        take: 10,
      }),
      prisma.bodyMeasurementLog.findMany({
        where: { traineeId },
        orderBy: { measurementDate: 'desc' },
        take: 10,
      }),
    ]);

    return {
      id: assignment.trainee.id,
      firstName: assignment.trainee.firstName,
      lastName: assignment.trainee.lastName,
      email: assignment.trainee.email,
      phone: assignment.trainee.phone,
      age: calcAge(profile?.dateOfBirth),
      goal: profile?.goal ?? null,
      heightCm: profile?.heightCm ? Number(profile.heightCm) : null,
      currentWeightKg: profile?.currentWeightKg ? Number(profile.currentWeightKg) : null,
      injuryHistory: profile?.injuryHistory ?? null,
      assignmentStatus: assignment.status,
      programs: programs.map((p) => ({
        id: p.program.id,
        name: p.program.name,
        status: p.program.status,
        programType: p.program.programType,
        assignedAt: p.assignedAt.toISOString(),
      })),
      workoutHistory: logs.map((log) => {
        const planned = getCurrentVersionExercises(
          log.session.sessionVersion,
          log.session.exercises
        ).length;
        const completed = log.exercises.length;
        return {
          id: log.id,
          sessionName: log.session.name,
          programName: log.session.program.name,
          workoutDate: log.workoutDate.toISOString().slice(0, 10),
          completionPercent: planned > 0 ? Math.round((completed / planned) * 100) : 100,
          difficultyRating: log.feedback?.difficultyRating ?? null,
        };
      }),
      metrics: metrics.map((m) => ({
        id: m.id,
        measurementDate: m.measurementDate.toISOString().slice(0, 10),
        weightKg: Number(m.weightKg),
        bodyFatPercent: m.bodyFatPercent ? Number(m.bodyFatPercent) : null,
      })),
    };
  }

  async listPrograms(ptId: string): Promise<ProgramSummary[]> {
    const programs = await prisma.trainingProgram.findMany({
      where: { ptId },
      include: { _count: { select: { sessions: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      objective: p.objective,
      programType: p.programType,
      durationWeeks: p.durationWeeks,
      status: p.status,
      sessionCount: p._count.sessions,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async createProgram(ptId: string, input: CreateProgramInput, lng: SupportedLanguage) {
    const program = await prisma.trainingProgram.create({
      data: {
        ptId,
        name: input.name,
        objective: input.objective,
        programType: input.programType,
        durationWeeks: input.durationWeeks,
        notes: input.notes,
        status: ProgramStatus.draft,
      },
    });

    return {
      program,
      message: t(PT_I18N_KEYS.programCreated, lng),
    };
  }

  async createSession(
    ptId: string,
    programId: string,
    input: CreateSessionInput,
    lng: SupportedLanguage
  ) {
    await assertProgramOwned(ptId, programId);

    const session = await prisma.workoutSession.create({
      data: {
        programId,
        name: input.name,
        sessionType: input.sessionType,
        scheduledDate: null,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        notes: input.notes,
        status: SessionStatus.draft,
      },
    });

    return {
      session,
      message: t(PT_I18N_KEYS.sessionCreated, lng),
    };
  }

  async listSessions(ptId: string, programId: string): Promise<SessionSummary[]> {
    await assertProgramOwned(ptId, programId);

    const sessions = await prisma.workoutSession.findMany({
      where: { programId },
      include: { _count: { select: { exercises: true } } },
      orderBy: { scheduledDate: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      name: s.name,
      sessionType: s.sessionType,
      scheduledDate: s.scheduledDate ? s.scheduledDate.toISOString().slice(0, 10) : null,
      estimatedDurationMinutes: s.estimatedDurationMinutes,
      status: s.status,
      exerciseCount: s._count.exercises,
    }));
  }

  async scheduleSession(
    ptId: string,
    programId: string,
    sessionId: string,
    input: ScheduleSessionInput,
    lng: SupportedLanguage
  ) {
    await assertProgramOwned(ptId, programId);

    const source = await prisma.workoutSession.findFirst({
      where: { id: sessionId, programId },
      include: { exercises: true },
    });

    if (!source) {
      throw new AppError(PT_ERROR_CODES.SESSION_NOT_FOUND, PT_I18N_KEYS.sessionNotFound, 404);
    }

    const currentExercises = getCurrentVersionExercises(source.sessionVersion, source.exercises);
    if (currentExercises.length === 0) {
      throw new AppError(PT_ERROR_CODES.SESSION_NOT_FOUND, PT_I18N_KEYS.exerciseNameRequired, 400);
    }

    const createdIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const dateStr of input.dates) {
        const scheduledDate = new Date(dateStr);
        const created = await tx.workoutSession.create({
          data: {
            programId,
            name: source.name,
            sessionType: source.sessionType,
            scheduledDate,
            estimatedDurationMinutes: source.estimatedDurationMinutes,
            notes: source.notes,
            status: SessionStatus.active,
            sessionVersion: 1,
            exercises: {
              create: currentExercises.map((e) => ({
                exerciseName: e.exerciseName,
                plannedSets: e.plannedSets,
                plannedReps: e.plannedReps,
                plannedWeightKg: e.plannedWeightKg,
                restSeconds: e.restSeconds,
                notes: e.notes,
                orderIndex: e.orderIndex,
                blockIndex: e.blockIndex,
                blockType: e.blockType,
                sessionVersion: 1,
              })),
            },
          },
        });
        createdIds.push(created.id);
      }
    });

    return {
      createdSessionIds: createdIds,
      message: t(PT_I18N_KEYS.sessionScheduled, lng),
    };
  }

  async addExercises(
    ptId: string,
    programId: string,
    sessionId: string,
    input: AddExercisesInput,
    lng: SupportedLanguage
  ) {
    await assertProgramOwned(ptId, programId);

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, programId },
      include: { exercises: true },
    });

    if (!session) {
      throw new AppError(PT_ERROR_CODES.SESSION_NOT_FOUND, PT_I18N_KEYS.sessionNotFound, 404);
    }

    const currentExercises = getCurrentVersionExercises(session.sessionVersion, session.exercises);
    const flatExercises = flattenExerciseInput(input);
    const logCount = await prisma.workoutLog.count({ where: { sessionId } });

    let targetVersion = session.sessionVersion;

    const created = await prisma.$transaction(async (tx) => {
      if (currentExercises.length > 0) {
        if (logCount > 0) {
          targetVersion = session.sessionVersion + 1;
          await tx.workoutSession.update({
            where: { id: sessionId },
            data: { sessionVersion: targetVersion },
          });
        } else {
          await tx.workoutSessionExercise.deleteMany({
            where: { sessionId, sessionVersion: session.sessionVersion },
          });
        }
      }

      return Promise.all(
        flatExercises.map((exercise, index) =>
          tx.workoutSessionExercise.create({
            data: {
              sessionId,
              exerciseName: exercise.exerciseName,
              plannedSets: exercise.plannedSets,
              plannedReps: exercise.plannedReps,
              plannedWeightKg: exercise.plannedWeightKg,
              restSeconds: exercise.restSeconds,
              notes: exercise.notes,
              orderIndex: index,
              blockIndex: exercise.blockIndex,
              blockType: exercise.blockType,
              sessionVersion: targetVersion,
            },
          })
        )
      );
    });

    if (session.status === SessionStatus.draft) {
      await prisma.workoutSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.active },
      });
    }

    return {
      exercises: created as ExerciseSummary[],
      message: t(PT_I18N_KEYS.exercisesAdded, lng),
    };
  }

  async getProgramDetail(ptId: string, programId: string): Promise<ProgramDetailResponse> {
    const program = await prisma.trainingProgram.findFirst({
      where: { id: programId, ptId },
      include: {
        sessions: {
          include: { _count: { select: { exercises: true } } },
          orderBy: { scheduledDate: 'asc' },
        },
        assignments: true,
      },
    });

    if (!program) {
      throw new AppError(PT_ERROR_CODES.PROGRAM_NOT_FOUND, PT_I18N_KEYS.programNotFound, 404);
    }

    const traineeIds = program.assignments.map((a) => a.traineeId);
    const trainees = traineeIds.length
      ? await prisma.user.findMany({
          where: { id: { in: traineeIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];

    const traineeMap = new Map(trainees.map((t) => [t.id, t]));
    const assignedTrainees: AssignedTraineeSummary[] = program.assignments.map((a) => {
      const trainee = traineeMap.get(a.traineeId);
      return {
        id: a.traineeId,
        firstName: trainee?.firstName ?? null,
        lastName: trainee?.lastName ?? null,
        email: trainee?.email ?? '',
        assignedAt: a.assignedAt.toISOString(),
      };
    });

    return {
      id: program.id,
      name: program.name,
      objective: program.objective,
      programType: program.programType,
      durationWeeks: program.durationWeeks,
      status: program.status,
      sessionCount: program.sessions.length,
      createdAt: program.createdAt.toISOString(),
      notes: program.notes,
      startDate: program.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: program.endDate?.toISOString().slice(0, 10) ?? null,
      sessions: program.sessions.map((s) => ({
        id: s.id,
        name: s.name,
        sessionType: s.sessionType,
        scheduledDate: s.scheduledDate ? s.scheduledDate.toISOString().slice(0, 10) : null,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        status: s.status,
        exerciseCount: s._count.exercises,
      })),
      assignedTrainees,
    };
  }

  async updateProgram(
    ptId: string,
    programId: string,
    input: UpdateProgramInput,
    lng: SupportedLanguage
  ) {
    await assertProgramOwned(ptId, programId);

    const program = await prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.objective !== undefined ? { objective: input.objective } : {}),
        ...(input.programType !== undefined ? { programType: input.programType } : {}),
        ...(input.durationWeeks !== undefined ? { durationWeeks: input.durationWeeks } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    return {
      program,
      message: t(PT_I18N_KEYS.programUpdated, lng),
    };
  }

  async assignProgram(
    ptId: string,
    programId: string,
    input: AssignProgramInput,
    lng: SupportedLanguage
  ) {
    const program = await assertProgramOwned(ptId, programId);
    await assertTraineeAssigned(ptId, input.traineeId);

    const existing = await prisma.programTraineeAssignment.findUnique({
      where: {
        programId_traineeId: { programId, traineeId: input.traineeId },
      },
    });

    if (existing) {
      throw new AppError(
        PT_ERROR_CODES.ALREADY_ASSIGNED,
        PT_I18N_KEYS.alreadyAssigned,
        409
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.programTraineeAssignment.create({
        data: { programId, traineeId: input.traineeId },
      });

      let updatedProgram = program;
      if (program.status === ProgramStatus.draft) {
        updatedProgram = await tx.trainingProgram.update({
          where: { id: programId },
          data: {
            status: ProgramStatus.active,
            startDate: program.startDate ?? new Date(),
          },
        });
      }

      return { assignment, program: updatedProgram };
    });

    return {
      program: result.program,
      assignedAt: result.assignment.assignedAt.toISOString(),
      message: t(PT_I18N_KEYS.programAssigned, lng),
    };
  }

  async getSessionDetail(
    ptId: string,
    programId: string,
    sessionId: string
  ): Promise<SessionDetailResponse> {
    await assertProgramOwned(ptId, programId);

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, programId },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!session) {
      throw new AppError(PT_ERROR_CODES.SESSION_NOT_FOUND, PT_I18N_KEYS.sessionNotFound, 404);
    }

    const currentExercises = getCurrentVersionExercises(session.sessionVersion, session.exercises);

    return {
      id: session.id,
      name: session.name,
      sessionType: session.sessionType,
      scheduledDate: session.scheduledDate
        ? session.scheduledDate.toISOString().slice(0, 10)
        : null,
      estimatedDurationMinutes: session.estimatedDurationMinutes,
      status: session.status,
      exerciseCount: currentExercises.length,
      notes: session.notes,
      sessionVersion: session.sessionVersion,
      exercises: currentExercises.map((e) => ({
        id: e.id,
        exerciseName: e.exerciseName,
        plannedSets: e.plannedSets,
        plannedReps: e.plannedReps,
        plannedWeightKg: e.plannedWeightKg ? Number(e.plannedWeightKg) : null,
        restSeconds: e.restSeconds,
        notes: e.notes,
        orderIndex: e.orderIndex,
        blockIndex: e.blockIndex,
        blockType: e.blockType,
      })),
    };
  }

  async updateSession(
    ptId: string,
    programId: string,
    sessionId: string,
    input: UpdateSessionInput,
    lng: SupportedLanguage
  ) {
    await assertProgramOwned(ptId, programId);

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, programId },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!session) {
      throw new AppError(PT_ERROR_CODES.SESSION_NOT_FOUND, PT_I18N_KEYS.sessionNotFound, 404);
    }

    const newVersion = session.sessionVersion + 1;
    const currentExercises = getCurrentVersionExercises(session.sessionVersion, session.exercises);
    const exercisesToCreate =
      input.exercises ??
      currentExercises.map((e) => ({
        exerciseName: e.exerciseName,
        plannedSets: e.plannedSets ?? undefined,
        plannedReps: e.plannedReps ?? undefined,
        plannedWeightKg: e.plannedWeightKg ? Number(e.plannedWeightKg) : undefined,
        restSeconds: e.restSeconds ?? undefined,
        notes: e.notes ?? undefined,
      }));

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.workoutSession.update({
        where: { id: sessionId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sessionType !== undefined ? { sessionType: input.sessionType } : {}),
          ...(input.estimatedDurationMinutes !== undefined
            ? { estimatedDurationMinutes: input.estimatedDurationMinutes }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          sessionVersion: newVersion,
        },
      });

      if (exercisesToCreate.length > 0) {
        await Promise.all(
          exercisesToCreate.map((exercise, index) =>
            tx.workoutSessionExercise.create({
              data: {
                sessionId,
                exerciseName: exercise.exerciseName,
                plannedSets: exercise.plannedSets,
                plannedReps: exercise.plannedReps,
                plannedWeightKg: exercise.plannedWeightKg,
                restSeconds: exercise.restSeconds,
                notes: exercise.notes,
                orderIndex: index,
                sessionVersion: newVersion,
              },
            })
          )
        );
      }

      return updatedSession;
    });

    return {
      session: updated,
      message: t(PT_I18N_KEYS.sessionUpdated, lng),
    };
  }

  async deleteSession(
    ptId: string,
    programId: string,
    sessionId: string,
    lng: SupportedLanguage
  ) {
    await assertProgramOwned(ptId, programId);

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, programId },
    });

    if (!session) {
      throw new AppError(PT_ERROR_CODES.SESSION_NOT_FOUND, PT_I18N_KEYS.sessionNotFound, 404);
    }

    await prisma.workoutSession.delete({ where: { id: sessionId } });

    return {
      message: t(PT_I18N_KEYS.workoutDeleted, lng),
    };
  }

  async inviteTrainee(ptId: string, input: InviteTraineeInput, lng: SupportedLanguage) {
    const trainee = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!trainee || trainee.role !== UserRole.trainee) {
      throw new AppError(PT_ERROR_CODES.TRAINEE_NOT_FOUND, PT_I18N_KEYS.traineeNotFound, 404);
    }

    if (trainee.status === UserStatus.inactive || trainee.status === UserStatus.deleted) {
      throw new AppError(PT_ERROR_CODES.TRAINEE_NOT_FOUND, PT_I18N_KEYS.traineeNotFound, 404);
    }

    const existing = await prisma.ptTraineeAssignment.findFirst({
      where: { ptId, traineeId: trainee.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.status === AssignmentStatus.active) {
      throw new AppError(PT_ERROR_CODES.ALREADY_ASSIGNED, PT_I18N_KEYS.alreadyAssigned, 409);
    }

    if (existing?.status === AssignmentStatus.invite_pending) {
      throw new AppError(
        PT_ERROR_CODES.INVITE_ALREADY_PENDING,
        PT_I18N_KEYS.inviteAlreadyPending,
        409
      );
    }

    let assignment;
    if (existing?.status === AssignmentStatus.invite_rejected) {
      assignment = await prisma.ptTraineeAssignment.update({
        where: { id: existing.id },
        data: {
          status: AssignmentStatus.invite_pending,
          assignedAt: new Date(),
          endedAt: null,
        },
      });
    } else if (existing) {
      assignment = await prisma.ptTraineeAssignment.update({
        where: { id: existing.id },
        data: {
          status: AssignmentStatus.invite_pending,
          assignedAt: new Date(),
        },
      });
    } else {
      assignment = await prisma.ptTraineeAssignment.create({
        data: {
          ptId,
          traineeId: trainee.id,
          status: AssignmentStatus.invite_pending,
        },
      });
    }

    const pt = await prisma.user.findUnique({ where: { id: ptId } });
    if (pt) {
      await createUserNotification(
        trainee.id,
        'pt_invite',
        'Training invitation',
        `${formatUserName(pt.firstName, pt.lastName, pt.email)} invited you to join as a trainee.`,
        { assignmentId: assignment.id, ptId }
      );
    }

    return {
      assignmentId: assignment.id,
      traineeId: trainee.id,
      status: assignment.status,
      message: t(PT_I18N_KEYS.inviteSent, lng),
    };
  }

  async resendInvite(ptId: string, assignmentId: string, lng: SupportedLanguage) {
    const assignment = await prisma.ptTraineeAssignment.findFirst({
      where: { id: assignmentId, ptId },
      include: { trainee: true, pt: true },
    });

    if (!assignment || assignment.status !== AssignmentStatus.invite_rejected) {
      throw new AppError(PT_ERROR_CODES.NOT_FOUND, PT_I18N_KEYS.notFound, 404);
    }

    const updated = await prisma.ptTraineeAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.invite_pending,
        assignedAt: new Date(),
      },
    });

    await createUserNotification(
      assignment.traineeId,
      'pt_invite',
      'Training invitation',
      `${formatUserName(assignment.pt.firstName, assignment.pt.lastName, assignment.pt.email)} invited you again.`,
      { assignmentId: updated.id, ptId }
    );

    return {
      assignmentId: updated.id,
      status: updated.status,
      message: t(PT_I18N_KEYS.inviteResent, lng),
    };
  }

  async cancelInvite(ptId: string, assignmentId: string, lng: SupportedLanguage) {
    const assignment = await prisma.ptTraineeAssignment.findFirst({
      where: {
        id: assignmentId,
        ptId,
        status: { in: [AssignmentStatus.invite_pending, AssignmentStatus.invite_rejected] },
      },
    });

    if (!assignment) {
      throw new AppError(PT_ERROR_CODES.NOT_FOUND, PT_I18N_KEYS.notFound, 404);
    }

    await prisma.ptTraineeAssignment.delete({ where: { id: assignment.id } });

    return {
      message: t(PT_I18N_KEYS.inviteCancelled, lng),
    };
  }
}

export const ptService = new PtService();
