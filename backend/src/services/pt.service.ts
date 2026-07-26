import {
  AssignmentStatus,
  Prisma,
  ProgramStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { SupportedLanguage, t } from '../config/i18n';
import { AppError } from '../utils/errors';
import { PT_ERROR_CODES, PT_I18N_KEYS } from '../types/pt.errors';
import {
  AddExercisesInput,
  CreateProgramInput,
  CreateSessionInput,
  TraineeListQuery,
} from '../validators/pt.validator';
import {
  ExerciseSummary,
  PaginatedResponse,
  ProgramSummary,
  PtActivityItem,
  PtDashboardResponse,
  PtDashboardTraineeRow,
  SessionSummary,
  TraineeDetailResponse,
  TraineeListItem,
} from '../types/pt';

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

    const [traineeCount, programCount, workoutsThisWeek, assignments, recentLogs, recentPrograms] =
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
        title: `${log.trainee.firstName ?? ''} ${log.trainee.lastName ?? ''}`.trim() || log.trainee.email,
        subtitle: `${log.session.name} · ${log.session.program.name}`,
        occurredAt: log.createdAt.toISOString(),
      })),
      ...recentPrograms.map((p) => ({
        id: p.id,
        type: 'program_created' as const,
        title: p.name,
        subtitle: p.programType,
        occurredAt: p.createdAt.toISOString(),
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
        const planned = log.session.exercises.length;
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
        scheduledDate: new Date(input.scheduledDate),
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        notes: input.notes,
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
      scheduledDate: s.scheduledDate.toISOString().slice(0, 10),
      estimatedDurationMinutes: s.estimatedDurationMinutes,
      status: s.status,
      exerciseCount: s._count.exercises,
    }));
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

    const startIndex = session.exercises.length;

    const created = await prisma.$transaction(
      input.exercises.map((exercise, index) =>
        prisma.workoutSessionExercise.create({
          data: {
            sessionId,
            exerciseName: exercise.exerciseName,
            plannedSets: exercise.plannedSets,
            plannedReps: exercise.plannedReps,
            plannedWeightKg: exercise.plannedWeightKg,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes,
            orderIndex: startIndex + index,
            sessionVersion: session.sessionVersion,
          },
        })
      )
    );

    return {
      exercises: created as ExerciseSummary[],
      message: t(PT_I18N_KEYS.exercisesAdded, lng),
    };
  }
}

export const ptService = new PtService();
