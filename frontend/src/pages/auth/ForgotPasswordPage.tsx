import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '@/components/template';
import { Alert } from '@/components/common/Alert';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { authApi, getApiErrorMessage } from '@/services/auth.service';
import { createForgotPasswordSchema, ForgotPasswordFormData } from '@/utils/validation';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const schema = createForgotPasswordSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data);
      setSuccess(t('auth.forgotPassword.success'));
    } catch (err) {
      setError(getApiErrorMessage(err, 'auth.errors.forgotFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card title={t('auth.forgotPassword.title')} subtitle={t('auth.forgotPassword.subtitle')}>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label={t('auth.forgotPassword.email')}
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
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
              ? t('auth.forgotPassword.submitting')
              : t('auth.forgotPassword.submit')}
          </Button>

          <p className="text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
};
