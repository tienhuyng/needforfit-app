import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Label } from '@/components/ui/label';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { createSessionSchema, CreateSessionFormData } from '@/utils/pt-validation';
import { cn } from '@/lib/utils';

export const CreateSessionPage: React.FC = () => {
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
      const session = await ptApi.createSession(programId, data);
      navigate(`/pt/programs/${programId}/sessions/${session.id}/exercises`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PTLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pt/programs/new">{t('pt.common.back')}</Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{t('pt.sessions.createTitle')}</h2>
          <p className="text-muted-foreground">{t('pt.sessions.createSubtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('pt.sessions.createTitle')}</CardTitle>
            <CardDescription>{t('pt.sessions.createSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert type="error" message={error} />}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label={t('pt.sessions.name')}
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="space-y-2">
                <Label htmlFor="sessionType">{t('pt.sessions.type')}</Label>
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
                {errors.sessionType && (
                  <p className="text-sm font-medium text-destructive" role="alert">
                    {errors.sessionType.message}
                  </p>
                )}
              </div>

              <Input
                label={t('pt.sessions.scheduledDate')}
                type="date"
                error={errors.scheduledDate?.message}
                {...register('scheduledDate')}
              />

              <Input
                label={t('pt.sessions.duration')}
                type="number"
                min={1}
                error={errors.estimatedDurationMinutes?.message}
                {...register('estimatedDurationMinutes')}
              />

              <div className="space-y-2">
                <Label htmlFor="notes">{t('pt.sessions.notes')}</Label>
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
                  : t('pt.sessions.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PTLayout>
  );
};
