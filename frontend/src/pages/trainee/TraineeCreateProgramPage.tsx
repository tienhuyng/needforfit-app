import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
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
import { createProgramSchema, CreateProgramFormData } from '@/utils/pt-validation';
import { cn } from '@/lib/utils';

export const TraineeCreateProgramPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const schema = createProgramSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProgramFormData>({
    resolver: zodResolver(schema),
    defaultValues: { programType: 'strength' },
  });

  const onSubmit = async (data: CreateProgramFormData) => {
    setError('');
    setIsLoading(true);
    try {
      const result = await traineeApi.createSelfProgram(data);
      navigate(`/trainee/self-programs/${result.programId}/sessions/new`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TraineeLayout title={t('trainee.selfTraining.createProgramTitle')} hideNav>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('trainee.selfTraining.createProgramTitle')}</CardTitle>
            <CardDescription>{t('trainee.selfTraining.createProgramDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert type="error" message={error} />}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label={t('pt.programs.name')}
                labelRequired
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label={t('pt.programs.objective')}
                error={errors.objective?.message}
                {...register('objective')}
              />

              <div className="space-y-2">
                <FormLabel htmlFor="programType" required>
                  {t('pt.programs.type')}
                </FormLabel>
                <select
                  id="programType"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    errors.programType && 'border-destructive focus-visible:ring-destructive'
                  )}
                  {...register('programType')}
                >
                  <option value="strength">{t('pt.programTypes.strength')}</option>
                  <option value="cardio">{t('pt.programTypes.cardio')}</option>
                  <option value="flexibility">{t('pt.programTypes.flexibility')}</option>
                  <option value="mixed">{t('pt.programTypes.mixed')}</option>
                </select>
              </div>

              <Input
                label={t('pt.programs.durationWeeks')}
                type="number"
                min={1}
                error={errors.durationWeeks?.message}
                {...register('durationWeeks')}
              />

              <div className="space-y-2">
                <FormLabel htmlFor="notes">{t('pt.programs.notes')}</FormLabel>
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
                  ? t('pt.programs.submitting')
                  : t('trainee.selfTraining.createProgramSubmit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </TraineeLayout>
  );
};
