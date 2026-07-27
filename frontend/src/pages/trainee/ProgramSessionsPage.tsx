import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/template';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { SessionDetailResponse, TraineeProgramSessionItem } from '@/types/trainee';

export const ProgramSessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { programId = '' } = useParams();
  const [sessions, setSessions] = useState<TraineeProgramSessionItem[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!programId) return;
      setError('');
      setIsLoading(true);
      try {
        setSessions(await traineeApi.getProgramSessions(programId));
      } catch (err) {
        setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [programId]);

  return (
    <TraineeLayout title={t('trainee.programs.sessionsTitle')} hideNav>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/trainee/programs">{t('trainee.common.back')}</Link>
        </Button>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">{t('trainee.programs.noSessions')}</p>
        ) : (
          sessions.map((s) => (
            <Link key={s.sessionId} to={`/trainee/programs/${programId}/sessions/${s.sessionId}`}>
              <Card className="hover:bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.sessionName}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {s.scheduledDate} · {s.exerciseCount} {t('trainee.home.exercises')}
                  {s.isCompleted && ` · ${t('trainee.programs.completed')}`}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </TraineeLayout>
  );
};

export const TraineeSessionDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { programId = '', sessionId = '' } = useParams();
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    void load();
  }, [programId, sessionId]);

  return (
    <TraineeLayout title={t('trainee.session.title')} hideNav>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/trainee/programs/${programId}`}>{t('trainee.common.back')}</Link>
        </Button>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : session ? (
          <>
            <div>
              <h2 className="text-xl font-bold">{session.sessionName}</h2>
              <p className="text-sm text-muted-foreground">
                {session.programName} · {session.scheduledDate}
              </p>
            </div>

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
          </>
        ) : null}
      </div>
    </TraineeLayout>
  );
};
