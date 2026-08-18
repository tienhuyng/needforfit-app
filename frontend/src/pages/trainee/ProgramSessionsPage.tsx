import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { ScheduleWorkoutModal } from '@/components/pt/ScheduleWorkoutModal';
import { Badge } from '@/components/ui/badge';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/template';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { TraineeProgramSessionItem } from '@/types/trainee';

export const ProgramSessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { programId = '' } = useParams();
  const [sessions, setSessions] = useState<TraineeProgramSessionItem[]>([]);
  const [isSelfProgram, setIsSelfProgram] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleSessionId, setScheduleSessionId] = useState<string | null>(null);
  const [scheduleSessionName, setScheduleSessionName] = useState('');

  const load = useCallback(async () => {
    if (!programId) return;
    setError('');
    setIsLoading(true);
    try {
      const [sessionList, programs] = await Promise.all([
        traineeApi.getProgramSessions(programId),
        traineeApi.getPrograms(),
      ]);
      setSessions(sessionList);
      setIsSelfProgram(programs.find((p) => p.id === programId)?.isSelfTraining ?? false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatScheduledDate = (date: string | null | undefined) =>
    date && date.length > 0 ? date : t('pt.programDetail.unscheduled');

  return (
    <TraineeLayout title={t('trainee.programs.sessionsTitle')} hideNav>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/trainee/programs">{t('trainee.common.back')}</Link>
        </Button>

        {isSelfProgram && (
          <Button asChild className="w-full">
            <Link to={`/trainee/self-programs/${programId}/sessions/new`}>
              {t('trainee.selfTraining.addWorkout')}
            </Link>
          </Button>
        )}

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">{t('trainee.programs.noSessions')}</p>
        ) : (
          sessions.map((s) => (
            <Card key={s.sessionId} className="hover:bg-muted/30">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{s.sessionName}</CardTitle>
                  {s.isTemplate && (
                    <Badge variant="secondary">{t('trainee.selfTraining.templateBadge')}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {formatScheduledDate(s.scheduledDate)} · {s.exerciseCount}{' '}
                  {t('trainee.home.exercises')}
                  {s.isCompleted && ` · ${t('trainee.programs.completed')}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!s.isTemplate && (
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/trainee/programs/${programId}/sessions/${s.sessionId}`}>
                        {t('trainee.session.viewDetail')}
                      </Link>
                    </Button>
                  )}
                  {s.canSchedule && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setScheduleSessionId(s.sessionId);
                        setScheduleSessionName(s.sessionName);
                      }}
                    >
                      {t('pt.schedule.button')}
                    </Button>
                  )}
                  {s.isTemplate && s.exerciseCount === 0 && (
                    <Button asChild variant="secondary" size="sm">
                      <Link
                        to={`/trainee/self-programs/${programId}/sessions/${s.sessionId}/exercises`}
                      >
                        {t('pt.programDetail.addExercises')}
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <ScheduleWorkoutModal
          open={scheduleSessionId != null}
          workoutName={scheduleSessionName}
          onClose={() => setScheduleSessionId(null)}
          onSubmit={async (dates) => {
            if (!scheduleSessionId) return;
            await traineeApi.scheduleSelfSession(programId, scheduleSessionId, dates);
            setSuccess(t('trainee.messages.sessionScheduled'));
            setScheduleSessionId(null);
            await load();
          }}
        />
      </div>
    </TraineeLayout>
  );
};

export { TraineeSessionDetailPage } from '@/pages/trainee/TraineeSessionDetailPage';
