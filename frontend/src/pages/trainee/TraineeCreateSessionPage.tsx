import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { createSessionSchema, CreateSessionFormData } from '@/utils/pt-validation';
import { cn } from '@/lib/utils';

export const TraineeCreateSessionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { programId } = useParams<{ programId: string }>();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const schema = createSessionSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(schema),
    defaultValues: { sessionType: 'strength' },
  });

  const onSubmit = async (data: CreateSessionFormData) => {
    if (!programId) return;
    setError('');
    setIsLoading(true);
    try {
      const result = await traineeApi.createSelfSession(programId, data);
      navigate(`/trainee/self-programs/${programId}/sessions/${result.sessionId}/exercises`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TraineeLayout title={t('trainee.selfTraining.createWorkoutTitle')} hideNav>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('trainee.selfTraining.createWorkoutTitle')}</CardTitle>
            <CardDescription>{t('trainee.selfTraining.createWorkoutDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert type="error" message={error} />}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label={t('pt.sessions.name')}
                labelRequired
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="space-y-2">
                <FormLabel htmlFor="sessionType" required>
                  {t('pt.sessions.type')}
                </FormLabel>
                <select
                  id="sessionType"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    errors.sessionType && 'border-destructive focus-visible:ring-destructive'
                  )}
                  {...register('sessionType')}
                >
                  <option value="strength">{t('pt.sessionTypes.strength')}</option>
                  <option value="cardio">{t('pt.sessionTypes.cardio')}</option>
                  <option value="flexibility">{t('pt.sessionTypes.flexibility')}</option>
                </select>
              </div>

              <Input
                label={t('pt.sessions.duration')}
                type="number"
                min={1}
                error={errors.estimatedDurationMinutes?.message}
                {...register('estimatedDurationMinutes')}
              />

              <div className="space-y-2">
                <FormLabel htmlFor="notes">{t('pt.sessions.notes')}</FormLabel>
                <textarea
                  id="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('notes')}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading
                  ? t('pt.sessions.submitting')
                  : t('trainee.selfTraining.createWorkoutSubmit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </TraineeLayout>
  );
};
