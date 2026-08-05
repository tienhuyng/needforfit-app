import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageStickyHeader } from '@/components/common/PageStickyHeader';
import { BackButton } from '@/components/common/BackButton';
import { RatingBar } from '@/components/common/RatingBar';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/template';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { WorkoutLogDetail } from '@/types/trainee';
import { exerciseVolumeKg } from '@/utils/workout-volume';

export const WorkoutDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [detail, setDetail] = useState<WorkoutLogDetail | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setError('');
      setIsLoading(true);
      try {
        setDetail(await traineeApi.getWorkoutDetail(id));
      } catch (err) {
        setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [id]);

  return (
    <TraineeLayout title={t('trainee.detail.title')} hideNav>
      <PageStickyHeader
        back={
          <BackButton to="/trainee/history" labelKey="trainee.common.back" className="mb-0" />
        }
        title={detail?.sessionName ?? t('trainee.detail.title')}
        subtitle={
          detail ? `${detail.programName} · ${detail.workoutDate}` : undefined
        }
      />

      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : detail ? (
          <>
            {detail.isLocked && (
              <p className="text-xs text-muted-foreground">{t('trainee.detail.locked')}</p>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{t('trainee.detail.exercises')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('trainee.detail.totalVolume')}:{' '}
                  <span className="font-semibold text-foreground">{detail.totalVolumeKg} kg</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.exercises.map((ex) => {
                  const vol = exerciseVolumeKg(ex);
                  const sets = ex.setDetails?.length
                    ? ex.setDetails
                    : ex.actualSets
                      ? Array.from({ length: ex.actualSets }, () => ({
                          reps: ex.actualReps ?? undefined,
                          weightKg: ex.actualWeightKg ?? undefined,
                        }))
                      : [];

                  return (
                    <div key={ex.exerciseName} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">{ex.exerciseName}</p>
                        {vol > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t('trainee.detail.exerciseVolume')}: {vol} kg
                          </p>
                        )}
                      </div>
                      {sets.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {sets.map((s, i) => (
                            <li key={i}>
                              {t('trainee.log.set')} {i + 1}: {s.reps ?? '—'} {t('trainee.log.reps')} ·{' '}
                              {s.weightKg ?? '—'} kg
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-muted-foreground">{t('trainee.detail.noSetData')}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {detail.feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('trainee.detail.feedback')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <RatingBar
                    label={t('trainee.log.difficulty')}
                    value={detail.feedback.difficultyRating}
                  />
                  <RatingBar label={t('trainee.log.fatigue')} value={detail.feedback.fatigueRating} />
                  <p>
                    {t('trainee.log.pain')}:{' '}
                    {detail.feedback.painOrDiscomfort ? t('trainee.log.yes') : t('trainee.log.no')}
                  </p>
                  {detail.feedback.templateResponses && (
                    <div className="space-y-3 border-t pt-3">
                      <div>
                        <p className="font-medium">{t('trainee.log.templateQ1')}</p>
                        <p className="text-muted-foreground">
                          {detail.feedback.templateResponses.q1}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{t('trainee.log.templateQ2')}</p>
                        <p className="text-muted-foreground">
                          {detail.feedback.templateResponses.q2}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{t('trainee.log.templateQ3')}</p>
                        <p className="text-muted-foreground">
                          {detail.feedback.templateResponses.q3}
                        </p>
                      </div>
                    </div>
                  )}
                  {detail.feedback.traineeNotes && (
                    <div>
                      <p className="font-medium">{t('trainee.log.notes')}</p>
                      <p className="text-muted-foreground">{detail.feedback.traineeNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </TraineeLayout>
  );
};
