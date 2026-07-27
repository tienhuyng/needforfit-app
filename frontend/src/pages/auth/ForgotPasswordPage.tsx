import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
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
import { Alert } from '@/components/common/Alert';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { authApi, getApiErrorMessage } from '@/services/auth.service';
import { createForgotPasswordSchema, ForgotPasswordFormData } from '@/utils/validation';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
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
    setDevResetLink('');
    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(data);
      setSuccess(t('auth.forgotPassword.success'));
      if (result.resetLink) {
        setDevResetLink(result.resetLink);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'auth.errors.forgotFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t('auth.forgotPassword.title')}</CardTitle>
          <CardDescription>{t('auth.forgotPassword.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}
          {devResetLink && (
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-foreground">{t('auth.forgotPassword.devLinkTitle')}</p>
              <p className="mt-1 text-muted-foreground">{t('auth.forgotPassword.devLinkHint')}</p>
              <a
                href={devResetLink}
                className="mt-2 block break-all text-primary hover:underline"
              >
                {devResetLink}
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
              <Link to="/login" className="text-sm text-primary hover:underline font-medium">
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
