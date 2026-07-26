import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/template';
import { Label } from '@/components/ui/label';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { SessionDetailResponse } from '@/types/trainee';
import {
  createLogWorkoutSchema,
  LogWorkoutFormData,
  toLogWorkoutPayload,
} from '@/utils/trainee-validation';

export const LogWorkoutPage: React.FC = () => {
  const { t } = useTranslation();
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const schema = createLogWorkoutSchema(t);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogWorkoutFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      exercises: [],
      feedback: {
        difficultyRating: 5,
        fatigueRating: 5,
        painOrDiscomfort: undefined,
        templateResponses: { q1: '', q2: '', q3: '' },
        traineeNotes: '',
      },
    },
  });

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      setError('');
      setIsLoading(true);
      try {
        const detail = await traineeApi.getSession(sessionId);
        setSession(detail);
        reset({
          exercises: detail.exercises.map((e) => ({
            exerciseName: e.exerciseName,
            actualSets: e.plannedSets ?? undefined,
            actualReps: e.plannedReps ?? undefined,
            actualWeightKg: e.plannedWeightKg ?? undefined,
            notes: '',
          })),
          feedback: {
            difficultyRating: 5,
            fatigueRating: 5,
            painOrDiscomfort: undefined,
            templateResponses: { q1: '', q2: '', q3: '' },
            traineeNotes: '',
          },
        });
      } catch (err) {
        setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [sessionId, reset]);

  const onSubmit = async (data: LogWorkoutFormData) => {
    if (!sessionId || !session?.canLog) return;
    setError('');
    setSuccess('');
    try {
      const result = await traineeApi.logWorkout(toLogWorkoutPayload(sessionId, data));
      setSuccess(t('trainee.messages.logSuccess'));
      navigate(`/trainee/workouts/${result.logId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.submitFailed'));
    }
  };

  const isLocked = session && (!session.canLog || session.isLocked);

  return (
    <TraineeLayout title={t('trainee.log.title')} hideNav>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/trainee/home">{t('trainee.common.back')}</Link>
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
                {session.programName} · {session.scheduledDate}
              </p>
            </div>

            {isLocked ? (
              <Card>
                <CardContent className="flex items-center gap-3 py-6">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('trainee.log.lockedTitle')}</p>
                    <p className="text-sm text-muted-foreground">{t('trainee.log.lockedDesc')}</p>
                    {session.existingLogId && (
                      <Link
                        to={`/trainee/workouts/${session.existingLogId}`}
                        className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                      >
                        {t('trainee.home.viewLog')}
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('trainee.log.exercisesTitle')}</CardTitle>
                    <CardDescription>{t('trainee.log.exercisesDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.exercises.map((ex, index) => (
                      <div key={ex.id} className="space-y-3 rounded-lg border p-3">
                        <p className="font-medium">{ex.exerciseName}</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                          <span>{t('trainee.log.planned')}</span>
                          <span>{t('trainee.log.sets')}</span>
                          <span>{t('trainee.log.reps')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <span className="text-muted-foreground">—</span>
                          <span>{ex.plannedSets ?? '—'}</span>
                          <span>{ex.plannedReps ?? '—'}</span>
                        </div>
                        <input type="hidden" {...register(`exercises.${index}.exerciseName`)} />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor={`sets-${index}`} className="text-xs">
                              {t('trainee.log.actualSets')}
                            </Label>
                            <Input
                              id={`sets-${index}`}
                              type="number"
                              min={1}
                              {...register(`exercises.${index}.actualSets`)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`reps-${index}`} className="text-xs">
                              {t('trainee.log.actualReps')}
                            </Label>
                            <Input
                              id={`reps-${index}`}
                              type="number"
                              min={1}
                              {...register(`exercises.${index}.actualReps`)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`weight-${index}`} className="text-xs">
                              {t('trainee.log.actualWeight')}
                            </Label>
                            <Input
                              id={`weight-${index}`}
                              type="number"
                              min={0}
                              step="0.5"
                              {...register(`exercises.${index}.actualWeightKg`)}
                            />
                          </div>
                        </div>
                        {ex.plannedWeightKg != null && (
                          <p className="text-xs text-muted-foreground">
                            {t('trainee.log.plannedWeight')}: {ex.plannedWeightKg} kg
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('trainee.log.feedbackTitle')}</CardTitle>
                    <CardDescription>{t('trainee.log.feedbackDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="difficulty">
                        {t('trainee.log.difficulty')} ({t('trainee.log.ratingHint')})
                      </Label>
                      <Controller
                        name="feedback.difficultyRating"
                        control={control}
                        render={({ field }) => (
                          <input
                            id="difficulty"
                            type="range"
                            min={1}
                            max={10}
                            className="mt-2 w-full"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        )}
                      />
                      {errors.feedback?.difficultyRating && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.difficultyRating.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="fatigue">{t('trainee.log.fatigue')}</Label>
                      <Controller
                        name="feedback.fatigueRating"
                        control={control}
                        render={({ field }) => (
                          <input
                            id="fatigue"
                            type="range"
                            min={1}
                            max={10}
                            className="mt-2 w-full"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        )}
                      />
                      {errors.feedback?.fatigueRating && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.fatigueRating.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>{t('trainee.log.pain')}</Label>
                      <div className="mt-2 flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" value="yes" {...register('feedback.painOrDiscomfort')} />
                          {t('trainee.log.yes')}
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" value="no" {...register('feedback.painOrDiscomfort')} />
                          {t('trainee.log.no')}
                        </label>
                      </div>
                      {errors.feedback?.painOrDiscomfort && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.painOrDiscomfort.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="q1">{t('trainee.log.templateQ1')}</Label>
                      <Input id="q1" {...register('feedback.templateResponses.q1')} />
                      {errors.feedback?.templateResponses?.q1 && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.templateResponses.q1.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="q2">{t('trainee.log.templateQ2')}</Label>
                      <Input id="q2" {...register('feedback.templateResponses.q2')} />
                      {errors.feedback?.templateResponses?.q2 && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.templateResponses.q2.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="q3">{t('trainee.log.templateQ3')}</Label>
                      <Input id="q3" {...register('feedback.templateResponses.q3')} />
                      {errors.feedback?.templateResponses?.q3 && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.templateResponses.q3.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="notes">{t('trainee.log.notes')}</Label>
                      <Input id="notes" {...register('feedback.traineeNotes')} />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
                  {isSubmitting ? t('trainee.log.submitting') : t('trainee.log.submit')}
                </Button>
              </form>
            )}
          </>
        ) : null}
      </div>
    </TraineeLayout>
  );
};
