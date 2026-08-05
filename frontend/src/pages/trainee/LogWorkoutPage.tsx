import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { PageStickyHeader } from '@/components/common/PageStickyHeader';
import { BackButton } from '@/components/common/BackButton';
import { RatingScale } from '@/components/common/RatingScale';
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
import { FormLabel } from '@/components/common/FormLabel';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { SessionDetailResponse, SessionExerciseItem } from '@/types/trainee';
import {
  createLogWorkoutSchema,
  LogWorkoutFormData,
  toLogWorkoutPayload,
} from '@/utils/trainee-validation';

function buildSetEntries(ex: SessionExerciseItem) {
  const count = Math.max(1, ex.plannedSets ?? 1);
  return Array.from({ length: count }, () => ({
    reps: ex.plannedReps ?? undefined,
    weightKg: ex.plannedWeightKg ?? undefined,
  }));
}

type ExerciseSetFieldsProps = {
  exerciseIndex: number;
  plannedWeightKg: number | null;
  register: ReturnType<typeof useForm<LogWorkoutFormData>>['register'];
  control: ReturnType<typeof useForm<LogWorkoutFormData>>['control'];
};

const ExerciseSetFields: React.FC<ExerciseSetFieldsProps> = ({
  exerciseIndex,
  plannedWeightKg,
  register,
  control,
}) => {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${exerciseIndex}.setEntries`,
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
        <span className="w-8">{t('trainee.log.set')}</span>
        <span>{t('trainee.log.reps')}</span>
        <span>{t('trainee.log.actualWeight')}</span>
        <span className="w-8" />
      </div>
      {fields.map((field, setIndex) => (
        <div key={field.id} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
          <span className="w-8 text-sm tabular-nums text-muted-foreground">{setIndex + 1}</span>
          <Input
            type="number"
            min={1}
            {...register(`exercises.${exerciseIndex}.setEntries.${setIndex}.reps`, {
              valueAsNumber: true,
            })}
          />
          <Input
            type="number"
            min={0}
            step="0.5"
            {...register(`exercises.${exerciseIndex}.setEntries.${setIndex}.weightKg`, {
              valueAsNumber: true,
            })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={fields.length <= 1}
            onClick={() => remove(setIndex)}
            aria-label={t('trainee.log.removeSet')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => append({ reps: undefined, weightKg: undefined })}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('trainee.log.addSet')}
      </Button>
      {plannedWeightKg != null && (
        <p className="text-xs text-muted-foreground">
          {t('trainee.log.plannedWeight')}: {plannedWeightKg} kg
        </p>
      )}
    </div>
  );
};

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
            setEntries: buildSetEntries(e),
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
      <PageStickyHeader
        back={
          <BackButton
            to="/trainee/home"
            labelKey="trainee.common.back"
            className="mb-0"
          />
        }
        title={session?.sessionName ?? t('trainee.log.title')}
        subtitle={
          session ? `${session.programName} · ${session.scheduledDate}` : undefined
        }
      />

      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : session ? (
          <>
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
                        <p className="text-xs text-muted-foreground">
                          {t('trainee.log.planned')}: {ex.plannedSets ?? '—'} {t('trainee.log.sets')} ×{' '}
                          {ex.plannedReps ?? '—'} {t('trainee.log.reps')}
                        </p>
                        <input type="hidden" {...register(`exercises.${index}.exerciseName`)} />
                        <ExerciseSetFields
                          exerciseIndex={index}
                          plannedWeightKg={ex.plannedWeightKg}
                          register={register}
                          control={control}
                        />
                        {errors.exercises?.[index]?.setEntries && (
                          <p className="text-xs text-destructive">
                            {errors.exercises[index]?.setEntries?.message}
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
                      <FormLabel htmlFor="difficulty" required>
                        {t('trainee.log.difficulty')} ({t('trainee.log.ratingHint')})
                      </FormLabel>
                      <Controller
                        name="feedback.difficultyRating"
                        control={control}
                        render={({ field }) => (
                          <RatingScale
                            id="difficulty"
                            value={field.value}
                            onChange={field.onChange}
                            className="mt-2"
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
                      <FormLabel htmlFor="fatigue" required>
                        {t('trainee.log.fatigue')} ({t('trainee.log.ratingHint')})
                      </FormLabel>
                      <Controller
                        name="feedback.fatigueRating"
                        control={control}
                        render={({ field }) => (
                          <RatingScale
                            id="fatigue"
                            value={field.value}
                            onChange={field.onChange}
                            className="mt-2"
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
                      <FormLabel required>{t('trainee.log.pain')}</FormLabel>
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
                      <FormLabel htmlFor="q1" required>
                        {t('trainee.log.templateQ1')}
                      </FormLabel>
                      <Input id="q1" {...register('feedback.templateResponses.q1')} />
                      {errors.feedback?.templateResponses?.q1 && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.templateResponses.q1.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <FormLabel htmlFor="q2" required>
                        {t('trainee.log.templateQ2')}
                      </FormLabel>
                      <Input id="q2" {...register('feedback.templateResponses.q2')} />
                      {errors.feedback?.templateResponses?.q2 && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.templateResponses.q2.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <FormLabel htmlFor="q3" required>
                        {t('trainee.log.templateQ3')}
                      </FormLabel>
                      <Input id="q3" {...register('feedback.templateResponses.q3')} />
                      {errors.feedback?.templateResponses?.q3 && (
                        <p className="text-xs text-destructive">
                          {errors.feedback.templateResponses.q3.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <FormLabel htmlFor="notes">{t('trainee.log.notes')}</FormLabel>
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
