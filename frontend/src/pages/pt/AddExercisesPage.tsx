import React, { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { PTLayout } from '@/components/pt/PTLayout';
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
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { createAddExercisesSchema, AddExercisesFormData } from '@/utils/pt-validation';

const defaultExercise = {
  exerciseName: '',
  plannedSets: undefined,
  plannedReps: undefined,
  plannedWeightKg: undefined,
  restSeconds: undefined,
  notes: '',
};

export const AddExercisesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { programId, sessionId } = useParams<{ programId: string; sessionId: string }>();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const schema = createAddExercisesSchema(t);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddExercisesFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      exercises: [defaultExercise],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  });

  const onSubmit = async (data: AddExercisesFormData) => {
    if (!programId || !sessionId) return;
    setError('');
    setIsLoading(true);
    try {
      await ptApi.addExercises(programId, sessionId, data);
      navigate('/pt/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PTLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/pt/programs/${programId}/sessions/new`}>{t('pt.common.back')}</Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{t('pt.exercises.title')}</h2>
          <p className="text-muted-foreground">{t('pt.exercises.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('pt.exercises.title')}</CardTitle>
            <CardDescription>{t('pt.exercises.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert type="error" message={error} />}
            {errors.exercises?.message && (
              <Alert type="error" message={errors.exercises.message} />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {t('pt.exercises.exerciseNumber', { number: index + 1 })}
                    </h3>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        aria-label={t('pt.exercises.remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Input
                    label={t('pt.exercises.name')}
                    error={errors.exercises?.[index]?.exerciseName?.message}
                    {...register(`exercises.${index}.exerciseName`)}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label={t('pt.exercises.sets')}
                      type="number"
                      min={1}
                      error={errors.exercises?.[index]?.plannedSets?.message}
                      {...register(`exercises.${index}.plannedSets`)}
                    />
                    <Input
                      label={t('pt.exercises.reps')}
                      type="number"
                      min={1}
                      error={errors.exercises?.[index]?.plannedReps?.message}
                      {...register(`exercises.${index}.plannedReps`)}
                    />
                    <Input
                      label={t('pt.exercises.weight')}
                      type="number"
                      min={0}
                      step="0.5"
                      error={errors.exercises?.[index]?.plannedWeightKg?.message}
                      {...register(`exercises.${index}.plannedWeightKg`)}
                    />
                    <Input
                      label={t('pt.exercises.rest')}
                      type="number"
                      min={1}
                      error={errors.exercises?.[index]?.restSeconds?.message}
                      {...register(`exercises.${index}.restSeconds`)}
                    />
                  </div>

                  <Input
                    label={t('pt.exercises.notes')}
                    error={errors.exercises?.[index]?.notes?.message}
                    {...register(`exercises.${index}.notes`)}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => append(defaultExercise)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('pt.exercises.addAnother')}
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading
                  ? t('pt.exercises.submitting')
                  : t('pt.exercises.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PTLayout>
  );
};
