import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Alert } from '@/components/common/Alert';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { authApi, getApiErrorMessage, storeAuthToken } from '@/services/auth.service';
import { createRegisterSchema, RegisterFormData } from '@/utils/validation';
import { cn } from '@/lib/utils';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const schema = createRegisterSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'trainee' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);
    try {
      const result = await authApi.register(data);
      storeAuthToken(result.token);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'auth.errors.registerFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t('auth.register.title')}</CardTitle>
          <CardDescription>{t('auth.register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <Alert type="error" message={error} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('auth.register.firstName')}
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label={t('auth.register.lastName')}
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Input
              label={t('auth.register.email')}
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('auth.register.password')}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="space-y-2">
              <Label htmlFor="role">{t('auth.register.role')}</Label>
              <select
                id="role"
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  errors.role && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('role')}
              >
                <option value="trainee">{t('auth.register.roleTrainee')}</option>
                <option value="pt">{t('auth.register.rolePt')}</option>
              </select>
              {errors.role && (
                <p className="text-sm font-medium text-destructive" role="alert">
                  {errors.role.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? t('auth.register.submitting') : t('auth.register.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                {t('auth.register.loginLink')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
