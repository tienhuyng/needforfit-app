import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, Dumbbell, Lock } from 'lucide-react';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/template';
import { LineChart } from '@/components/ui/line-chart';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { TraineeHomeResponse } from '@/types/trainee';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<TraineeHomeResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);

  const loadHome = async () => {
    setError('');
    setIsLoading(true);
    try {
      setData(await traineeApi.getHome());
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHome();
  }, []);

  const handleInviteResponse = async (assignmentId: string, accept: boolean) => {
    setInviteActionId(assignmentId);
    setError('');
    try {
      await traineeApi.respondToPtInvite(assignmentId, accept);
      await loadHome();
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setInviteActionId(null);
    }
  };

  return (
    <TraineeLayout title={t('trainee.home.title')}>
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : data ? (
          <>
            {((data.ptInvites ?? []).length > 0) && (
              <Card className="border-amber-200 bg-amber-50/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t('trainee.home.invitesTitle')}</CardTitle>
                  <CardDescription>{t('trainee.home.invitesDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(data.ptInvites ?? []).map((invite) => (
                    <div
                      key={invite.assignmentId}
                      className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{invite.ptName}</p>
                        <p className="text-sm text-muted-foreground">{invite.ptEmail}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={inviteActionId === invite.assignmentId}
                          onClick={() => void handleInviteResponse(invite.assignmentId, true)}
                        >
                          {t('trainee.home.acceptInvite')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={inviteActionId === invite.assignmentId}
                          onClick={() => void handleInviteResponse(invite.assignmentId, false)}
                        >
                          {t('trainee.home.declineInvite')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('trainee.home.todayWorkout')}</CardTitle>
                <CardDescription>{t('trainee.home.todayWorkoutDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.todayWorkout ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold">{data.todayWorkout.sessionName}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.todayWorkout.programName} · {data.todayWorkout.exerciseCount}{' '}
                        {t('trainee.home.exercises')}
                      </p>
                    </div>
                    {data.todayWorkout.canLog ? (
                      <Button asChild className="h-12 w-full text-base" size="lg">
                        <Link to={`/trainee/log/${data.todayWorkout.sessionId}`}>
                          <Dumbbell className="mr-2 h-5 w-5" />
                          {t('trainee.home.logWorkout')}
                        </Link>
                      </Button>
                    ) : data.todayWorkout.existingLogId ? (
                      <Button asChild variant="secondary" className="w-full">
                        <Link to={`/trainee/workouts/${data.todayWorkout.existingLogId}`}>
                          {t('trainee.home.viewLog')}
                        </Link>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        {t('trainee.home.locked')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('trainee.home.noWorkoutToday')}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('trainee.home.upcoming')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.upcomingWorkouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('trainee.home.noUpcoming')}</p>
                ) : (
                  data.upcomingWorkouts.map((w) => (
                    <div
                      key={w.sessionId}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{w.sessionName}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.programName} · {w.scheduledDate}
                        </p>
                      </div>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{t('trainee.home.recentHistory')}</CardTitle>
                <Link
                  to="/trainee/history"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('trainee.home.viewAll')}
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('trainee.history.empty')}</p>
                ) : (
                  data.recentHistory.map((h) => (
                    <Link
                      key={h.id}
                      to={`/trainee/workouts/${h.id}`}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{h.sessionName}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.workoutDate} · {h.programName}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('trainee.home.weightTrend')}</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={data.weightTrend.map((p) => ({ date: p.date, value: p.weightKg }))}
                  valueLabel={t('trainee.metrics.weightKg')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('trainee.home.activePrograms')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.activePrograms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('trainee.home.noPrograms')}</p>
                ) : (
                  data.activePrograms.map((p) => (
                    <div key={p.id} className="rounded-md border p-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`pt.programTypes.${p.programType}`)} · {p.sessionCount}{' '}
                        {t('trainee.home.sessions')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </TraineeLayout>
  );
};
