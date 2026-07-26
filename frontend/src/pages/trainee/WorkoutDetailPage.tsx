import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/template';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { WorkoutLogDetail } from '@/types/trainee';

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
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/trainee/history">{t('trainee.common.back')}</Link>
        </Button>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : detail ? (
          <>
            <div>
              <h2 className="text-xl font-bold">{detail.sessionName}</h2>
              <p className="text-sm text-muted-foreground">
                {detail.programName} · {detail.workoutDate}
              </p>
              {detail.isLocked && (
                <p className="mt-1 text-xs text-muted-foreground">{t('trainee.detail.locked')}</p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('trainee.detail.exercises')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.exercises.map((ex) => (
                  <div key={ex.exerciseName} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{ex.exerciseName}</p>
                    <p className="text-muted-foreground">
                      {t('trainee.log.sets')}: {ex.actualSets ?? '—'} · {t('trainee.log.reps')}:{' '}
                      {ex.actualReps ?? '—'} · {t('trainee.log.actualWeight')}:{' '}
                      {ex.actualWeightKg ?? '—'} kg
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {detail.feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('trainee.detail.feedback')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {t('trainee.log.difficulty')}: {detail.feedback.difficultyRating}/10
                  </p>
                  <p>
                    {t('trainee.log.fatigue')}: {detail.feedback.fatigueRating}/10
                  </p>
                  <p>
                    {t('trainee.log.pain')}:{' '}
                    {detail.feedback.painOrDiscomfort ? t('trainee.log.yes') : t('trainee.log.no')}
                  </p>
                  {detail.feedback.templateResponses && (
                    <>
                      <p>{detail.feedback.templateResponses.q1}</p>
                      <p>{detail.feedback.templateResponses.q2}</p>
                      <p>{detail.feedback.templateResponses.q3}</p>
                    </>
                  )}
                  {detail.feedback.traineeNotes && (
                    <p className="text-muted-foreground">{detail.feedback.traineeNotes}</p>
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
