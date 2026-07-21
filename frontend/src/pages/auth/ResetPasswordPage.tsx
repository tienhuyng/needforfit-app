import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '@/components/template';
import { Alert } from '@/components/common/Alert';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { authApi, getApiErrorMessage } from '@/services/auth.service';
import { createResetPasswordSchema, ResetPasswordFormData } from '@/utils/validation';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const emailParam = searchParams.get('email') ?? '';

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const schema = createResetPasswordSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailParam },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError(t('auth.errors.resetFailed'));
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await authApi.resetPassword({ ...data, token });
      setSuccess(t('auth.resetPassword.success'));
    } catch (err) {
      setError(getApiErrorMessage(err, 'auth.errors.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')}>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label={t('auth.resetPassword.email')}
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={t('auth.resetPassword.newPassword')}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />

          <Input
            label={t('auth.resetPassword.confirmPassword')}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting || isLoading}
            disabled={!!success}
          >
            {isSubmitting || isLoading
              ? t('auth.resetPassword.submitting')
              : t('auth.resetPassword.submit')}
          </Button>

          {success && (
            <p className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
              >
                {t('auth.resetPassword.loginLink')}
              </Link>
            </p>
          )}
        </form>
      </Card>
    </AuthLayout>
  );
};
