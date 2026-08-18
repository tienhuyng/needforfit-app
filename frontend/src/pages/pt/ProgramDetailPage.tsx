import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { PageStickyHeader } from '@/components/common/PageStickyHeader';
import { PTLayout } from '@/components/pt/PTLayout';
import { AssignProgramModal } from '@/components/pt/AssignProgramModal';
import { Alert } from '@/components/common/Alert';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/template';
import { FormLabel } from '@/components/common/FormLabel';
import { Badge } from '@/components/ui/badge';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { ScheduleWorkoutModal } from '@/components/pt/ScheduleWorkoutModal';
import { ProgramDetailResponse } from '@/types/pt';
import { createProgramSchema, CreateProgramFormData } from '@/utils/pt-validation';

export const ProgramDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { programId = '' } = useParams();
  const [program, setProgram] = useState<ProgramDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [scheduleSessionId, setScheduleSessionId] = useState<string | null>(null);
  const [scheduleSessionName, setScheduleSessionName] = useState('');

  const schema = createProgramSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateProgramFormData>({
    resolver: zodResolver(schema),
  });

  const load = async () => {
    if (!programId) return;
    setError('');
    setIsLoading(true);
    try {
      const data = await ptApi.getProgram(programId);
      setProgram(data);
      reset({
        name: data.name,
        objective: data.objective ?? '',
        programType: data.programType,
        durationWeeks: data.durationWeeks ?? undefined,
        notes: data.notes ?? '',
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [programId, reset]);

  const onSave = async (data: CreateProgramFormData) => {
    if (!programId) return;
    setError('');
    setSuccess('');
    try {
      await ptApi.updateProgram(programId, data);
      setSuccess(t('pt.messages.programUpdated'));
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
    }
  };

  const handleDeleteWorkout = async (sessionId: string, sessionName: string) => {
    if (!programId) return;
    if (!window.confirm(t('pt.programDetail.deleteWorkoutConfirm', { name: sessionName }))) return;
    setError('');
    try {
      await ptApi.deleteSession(programId, sessionId);
      setSuccess(t('pt.messages.workoutDeleted'));
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
    }
  };

  return (
    <PTLayout>
      <PageStickyHeader
        backTo="/pt/programs"
        title={
          program ? (
            <>
              {program.name}
              <Badge className="ml-2 align-middle" variant="secondary">
                {t(`pt.programStatuses.${program.status}`)}
              </Badge>
            </>
          ) : (
            t('pt.programList.title')
          )
        }
        actions={
          program ? (
            <>
              <Button onClick={() => setAssignOpen(true)}>{t('pt.assign.open')}</Button>
              <Button asChild variant="secondary">
                <Link to={`/pt/programs/${programId}/sessions/new`}>
                  {t('pt.programDetail.addSession')}
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('pt.common.loading')}</p>
        ) : program ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('pt.programDetail.edit')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSave)} className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormLabel htmlFor="name" required>
                      {t('pt.programs.name')}
                    </FormLabel>
                    <Input id="name" {...register('name')} />
                  </div>
                  <div className="sm:col-span-2">
                    <FormLabel htmlFor="objective">{t('pt.programs.objective')}</FormLabel>
                    <Input id="objective" {...register('objective')} />
                  </div>
                  <div>
                    <FormLabel htmlFor="programType" required>
                      {t('pt.programs.type')}
                    </FormLabel>
                    <select
                      id="programType"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...register('programType')}
                    >
                      {(['strength', 'cardio', 'flexibility', 'mixed'] as const).map((type) => (
                        <option key={type} value={type}>
                          {t(`pt.programTypes.${type}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FormLabel htmlFor="durationWeeks">{t('pt.programs.durationWeeks')}</FormLabel>
                    <Input id="durationWeeks" type="number" {...register('durationWeeks')} />
                  </div>
                  <div className="sm:col-span-2">
                    <FormLabel htmlFor="notes">{t('pt.programs.notes')}</FormLabel>
                    <Input id="notes" {...register('notes')} />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('pt.programDetail.saving') : t('pt.programDetail.save')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('pt.programDetail.sessions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {program.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('pt.programDetail.noSessions')}</p>
                ) : (
                  program.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.scheduledDate ?? t('pt.programDetail.unscheduled')} · {s.exerciseCount}{' '}
                          {t('pt.programDetail.exercises')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="secondary" size="sm">
                          <Link to={`/pt/programs/${programId}/sessions/${s.id}/edit`}>
                            {t('pt.programDetail.editSession')}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setScheduleSessionId(s.id);
                            setScheduleSessionName(s.name);
                          }}
                        >
                          {t('pt.schedule.button')}
                        </Button>
                        <Button asChild size="sm">
                          <Link to={`/pt/programs/${programId}/sessions/${s.id}/exercises`}>
                            {t('pt.programDetail.addExercises')}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          aria-label={t('pt.programDetail.deleteWorkout')}
                          onClick={() => void handleDeleteWorkout(s.id, s.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('pt.programDetail.assignedTrainees')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {program.assignedTrainees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('pt.programDetail.noAssignees')}</p>
                ) : (
                  program.assignedTrainees.map((tr) => (
                    <div key={tr.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {[tr.firstName, tr.lastName].filter(Boolean).join(' ') || tr.email}
                      </p>
                      <p className="text-muted-foreground">{tr.email}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        <AssignProgramModal
          open={assignOpen}
          programId={programId}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setSuccess(t('pt.messages.programAssigned'));
            void load();
          }}
        />

        <ScheduleWorkoutModal
          open={scheduleSessionId != null}
          workoutName={scheduleSessionName}
          onClose={() => setScheduleSessionId(null)}
          onSubmit={async (dates) => {
            if (!scheduleSessionId) return;
            await ptApi.scheduleSession(programId, scheduleSessionId, dates);
            setSuccess(t('pt.messages.sessionScheduled'));
            await load();
          }}
        />
      </div>
    </PTLayout>
  );
};
