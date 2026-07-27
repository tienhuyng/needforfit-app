import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { SessionDetailResponse } from '@/types/pt';
import { createSessionSchema, CreateSessionFormData } from '@/utils/pt-validation';
import { cn } from '@/lib/utils';

export const EditSessionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { programId = '', sessionId = '' } = useParams();
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const schema = createSessionSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const load = async () => {
      if (!programId || !sessionId) return;
      setError('');
      setIsLoading(true);
      try {
        const data = await ptApi.getSession(programId, sessionId);
        setSession(data);
        reset({
          name: data.name,
          sessionType: data.sessionType,
          scheduledDate: data.scheduledDate,
          estimatedDurationMinutes: data.estimatedDurationMinutes ?? undefined,
          notes: data.notes ?? '',
        });
      } catch (err) {
        setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [programId, sessionId, reset]);

  const onSubmit = async (data: CreateSessionFormData) => {
    if (!programId || !sessionId) return;
    setError('');
    try {
      await ptApi.updateSession(programId, sessionId, data);
      navigate(`/pt/programs/${programId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
    }
  };

  return (
    <PTLayout>
      <div className="mx-auto max-w-lg space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/pt/programs/${programId}`}>{t('pt.common.back')}</Link>
        </Button>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('pt.common.loading')}</p>
        ) : session ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('pt.editSession.title')}</CardTitle>
              <CardDescription>
                {t('pt.editSession.subtitle', { version: session.sessionVersion + 1 })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('pt.sessions.name')}</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label>{t('pt.sessions.type')}</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['strength', 'cardio', 'flexibility'] as const).map((type) => (
                      <label
                        key={type}
                        className={cn(
                          'cursor-pointer rounded-md border px-3 py-2 text-sm',
                          'has-[:checked]:border-primary has-[:checked]:bg-primary/5'
                        )}
                      >
                        <input
                          type="radio"
                          value={type}
                          className="sr-only"
                          {...register('sessionType')}
                        />
                        {t(`pt.sessionTypes.${type}`)}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="scheduledDate">{t('pt.sessions.scheduledDate')}</Label>
                  <Input id="scheduledDate" type="date" {...register('scheduledDate')} />
                </div>
                <div>
                  <Label htmlFor="duration">{t('pt.sessions.duration')}</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...register('estimatedDurationMinutes')}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">{t('pt.sessions.notes')}</Label>
                  <Input id="notes" {...register('notes')} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t('pt.editSession.submitting') : t('pt.editSession.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PTLayout>
  );
};
