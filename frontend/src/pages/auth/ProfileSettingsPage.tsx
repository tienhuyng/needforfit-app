import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Alert } from '@/components/common/Alert';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/template';
import { Label } from '@/components/ui/label';
import { authApi, getApiErrorMessage } from '@/services/auth.service';
import { AuthUser } from '@/types/auth';
import { getAuthUser, getPostLoginPath, storeAuthUser } from '@/utils/auth-storage';
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
      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="text-center">
          {user && (
            <Button variant="ghost" size="sm" className="mb-2" asChild>
              <Link to={getPostLoginPath(user.role)}>{t('auth.profile.back')}</Link>
            </Button>
          )}
          <h2 className="text-xl font-semibold">{t('auth.profile.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('auth.profile.subtitle')}</p>
        </div>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.profile.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="firstName">{t('auth.register.firstName')}</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">{t('auth.register.lastName')}</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">{t('auth.profile.phone')}</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div>
                <Label htmlFor="preferredLanguage">{t('auth.profile.language')}</Label>
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
