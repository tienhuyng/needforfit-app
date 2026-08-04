import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageStickyHeader } from '@/components/common/PageStickyHeader';
import { BackButton } from '@/components/common/BackButton';
import { Alert } from '@/components/common/Alert';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/template';
import { FormLabel } from '@/components/common/FormLabel';
import { authApi, getApiErrorMessage } from '@/services/auth.service';
import { AuthUser } from '@/types/auth';
import { getAuthUser, storeAuthUser } from '@/utils/auth-storage';
import { SUPPORTED_LANGUAGES } from '@/config/i18n';

const languageOptions = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
] as const;

type ProfileFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  preferredLanguage: (typeof SUPPORTED_LANGUAGES)[number];
};

function toFormValues(user: AuthUser | null): ProfileFormData {
  const preferredLanguage = SUPPORTED_LANGUAGES.includes(
    user?.preferredLanguage as (typeof SUPPORTED_LANGUAGES)[number]
  )
    ? (user!.preferredLanguage as ProfileFormData['preferredLanguage'])
    : 'vi';

  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    preferredLanguage,
  };
}

export const ProfileSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t('auth.errors.firstNameRequired')),
        lastName: z.string().min(1, t('auth.errors.lastNameRequired')),
        phone: z.string().optional(),
        preferredLanguage: z.enum(['vi', 'en', 'zh', 'ja', 'es']),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(user),
  });

  useEffect(() => {
    reset(toFormValues(user));
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setError('');
    setSuccess('');
    try {
      const result = await authApi.updateProfile(data);
      const savedValues = toFormValues({ ...result.user, phone: data.phone ?? '' });
      storeAuthUser({ ...result.user, phone: data.phone ?? null });
      setUser({ ...result.user, phone: data.phone ?? null });
      reset(savedValues);
      await i18n.changeLanguage(savedValues.preferredLanguage);
      setSuccess(t('auth.profile.success'));
    } catch (err) {
      setError(getApiErrorMessage(err, 'auth.errors.generic'));
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-sm space-y-4 [--page-sticky-top:0px]">
        <PageStickyHeader
          className="-mx-0 px-0 sm:px-0"
          back={<BackButton labelKey="common.back" className="mb-0" />}
          title={t('auth.profile.title')}
          subtitle={t('auth.profile.subtitle')}
        />
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.profile.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <FormLabel htmlFor="firstName" required>
                  {t('auth.register.firstName')}
                </FormLabel>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="lastName" required>
                  {t('auth.register.lastName')}
                </FormLabel>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="phone">{t('auth.profile.phone')}</FormLabel>
                <Input id="phone" {...register('phone')} />
              </div>
              <div>
                <FormLabel htmlFor="preferredLanguage">{t('auth.profile.language')}</FormLabel>
                <select
                  id="preferredLanguage"
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('preferredLanguage')}
                >
                  {languageOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.preferredLanguage && (
                  <p className="text-xs text-destructive">{errors.preferredLanguage.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={!isDirty || isSubmitting}>
                {isSubmitting ? t('auth.profile.submitting') : t('auth.profile.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};
