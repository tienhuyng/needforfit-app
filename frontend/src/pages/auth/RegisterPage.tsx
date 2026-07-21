import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '@/components/template';
import { Alert } from '@/components/common/Alert';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { authApi, getApiErrorMessage, storeAuthToken } from '@/services/auth.service';
import { createRegisterSchema, RegisterFormData } from '@/utils/validation';

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
      <Card title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

          <div className="flex flex-col gap-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              {t('auth.register.role')}
            </label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              {...register('role')}
            >
              <option value="trainee">{t('auth.register.roleTrainee')}</option>
              <option value="pt">{t('auth.register.rolePt')}</option>
            </select>
            {errors.role && (
              <p className="text-sm text-red-500 font-medium" role="alert">
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

          <p className="text-center text-sm text-gray-600">
            {t('auth.register.hasAccount')}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
};
