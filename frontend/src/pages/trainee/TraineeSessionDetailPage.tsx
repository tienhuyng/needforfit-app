import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { ScheduleWorkoutModal } from '@/components/pt/ScheduleWorkoutModal';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/template';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { SessionDetailResponse } from '@/types/trainee';

export const TraineeSessionDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { programId = '', sessionId = '' } = useParams();
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const load = async () => {
    if (!programId || !sessionId) return;
    setError('');
    setIsLoading(true);
    try {
      setSession(await traineeApi.getProgramSession(programId, sessionId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, sessionId]);

  return (
    <TraineeLayout title={t('trainee.session.title')} hideNav>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/trainee/programs/${programId}`}>{t('trainee.common.back')}</Link>
        </Button>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : session ? (
          <>
            <div>
              <h2 className="text-xl font-bold">{session.sessionName}</h2>
              <p className="text-sm text-muted-foreground">
                {session.programName} ·{' '}
                {session.scheduledDate || t('pt.programDetail.unscheduled')}
              </p>
            </div>

            {session.canSchedule && (
              <Button type="button" className="w-full" onClick={() => setScheduleOpen(true)}>
                {t('pt.schedule.button')}
              </Button>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('trainee.session.exercises')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.exercises.map((ex) => (
                  <div key={ex.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{ex.exerciseName}</p>
                    <p className="text-muted-foreground">
                      {t('trainee.log.sets')}: {ex.plannedSets ?? '—'} · {t('trainee.log.reps')}:{' '}
                      {ex.plannedReps ?? '—'} · {t('trainee.log.actualWeight')}:{' '}
                      {ex.plannedWeightKg ?? '—'} kg
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {session.canLog ? (
              <Button asChild className="h-12 w-full">
                <Link to={`/trainee/log/${session.sessionId}`}>{t('trainee.session.logWorkout')}</Link>
              </Button>
            ) : session.existingLogId ? (
              <Button asChild variant="secondary" className="w-full">
                <Link to={`/trainee/workouts/${session.existingLogId}`}>
                  {t('trainee.home.viewLog')}
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t('trainee.session.locked')}</p>
            )}

            <ScheduleWorkoutModal
              open={scheduleOpen}
              workoutName={session.sessionName}
              onClose={() => setScheduleOpen(false)}
              onSubmit={async (dates) => {
                await traineeApi.scheduleSelfSession(programId, sessionId, dates);
                setSuccess(t('trainee.messages.sessionScheduled'));
                setScheduleOpen(false);
                await load();
              }}
            />
          </>
        ) : null}
      </div>
    </TraineeLayout>
  );
};
