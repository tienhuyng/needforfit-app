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
import { AuthUser, ProfileResponse } from '@/types/auth';
import { getAuthUser, storeAuthUser } from '@/utils/auth-storage';
import { SUPPORTED_LANGUAGES } from '@/config/i18n';

const languageOptions = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
] as const;

const TRAINEE_GOALS = [
  'lose_weight',
  'gain_muscle',
  'improve_health',
  'increase_strength',
  'improve_posture',
] as const;

type ProfileFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  preferredLanguage: (typeof SUPPORTED_LANGUAGES)[number];
  dateOfBirth: string;
  heightCm: string;
  currentWeightKg: string;
  goal: (typeof TRAINEE_GOALS)[number] | '';
  injuryHistory: string;
};

function toFormValues(profile: ProfileResponse | null, fallbackUser: AuthUser | null): ProfileFormData {
  const user = profile?.user ?? fallbackUser;
  const tp = profile?.traineeProfile;
  const preferredLanguage = SUPPORTED_LANGUAGES.includes(
    user?.preferredLanguage as (typeof SUPPORTED_LANGUAGES)[number]
  )
    ? (user!.preferredLanguage as ProfileFormData['preferredLanguage'])
    : 'vi';

  const goal =
    tp?.goal && TRAINEE_GOALS.includes(tp.goal as (typeof TRAINEE_GOALS)[number])
      ? (tp.goal as ProfileFormData['goal'])
      : '';

  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    preferredLanguage,
    dateOfBirth: tp?.dateOfBirth ?? '',
    heightCm: tp?.heightCm != null ? String(tp.heightCm) : '',
    currentWeightKg: tp?.currentWeightKg != null ? String(tp.currentWeightKg) : '',
    goal,
    injuryHistory: tp?.injuryHistory ?? '',
  };
}

function parseOptionalPositive(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const ProfileSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const isTrainee = user?.role === 'trainee';

  const schema = useMemo(() => {
    const optionalPositive = z
      .string()
      .optional()
      .refine((val) => val === undefined || val === '' || parseOptionalPositive(val) != null, {
        message: t('auth.errors.positiveNumber'),
      });

    return z.object({
      firstName: z.string().min(1, t('auth.errors.firstNameRequired')),
      lastName: z.string().min(1, t('auth.errors.lastNameRequired')),
      phone: z.string().optional(),
      preferredLanguage: z.enum(['vi', 'en', 'zh', 'ja', 'es']),
      dateOfBirth: z.string().optional(),
      heightCm: optionalPositive,
      currentWeightKg: optionalPositive,
      goal: z.enum(['', ...TRAINEE_GOALS]),
      injuryHistory: z.string().optional(),
    });
  }, [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(null, user),
  });

  useEffect(() => {
    const load = async () => {
      setIsLoadingProfile(true);
      setError('');
      try {
        const profile = await authApi.getProfile();
        setUser(profile.user);
        storeAuthUser(profile.user);
        reset(toFormValues(profile, profile.user));
      } catch (err) {
        setError(getApiErrorMessage(err, 'auth.errors.generic'));
        reset(toFormValues({ user: user!, traineeProfile: null }, user));
      } finally {
        setIsLoadingProfile(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: ProfileFormData) => {
    setError('');
    setSuccess('');
    try {
      const payload: Parameters<typeof authApi.updateProfile>[0] = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? '',
        preferredLanguage: data.preferredLanguage,
      };

      if (isTrainee) {
        payload.dateOfBirth = data.dateOfBirth ?? '';
        const height = parseOptionalPositive(data.heightCm);
        const weight = parseOptionalPositive(data.currentWeightKg);
        if (height !== undefined) payload.heightCm = height;
        if (weight !== undefined) payload.currentWeightKg = weight;
        payload.goal = data.goal;
        payload.injuryHistory = data.injuryHistory ?? '';
      }

      const result = await authApi.updateProfile(payload);
      setUser(result.user);
      storeAuthUser(result.user);
      reset(toFormValues(result, result.user));
      await i18n.changeLanguage(result.user.preferredLanguage);
      setSuccess(t('auth.profile.success'));
    } catch (err) {
      setError(getApiErrorMessage(err, 'auth.errors.generic'));
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md space-y-4 [--page-sticky-top:0px]">
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
            {isLoadingProfile ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : (
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

                {isTrainee && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <p className="text-sm font-medium">{t('auth.profile.traineeSectionTitle')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.profile.traineeSectionDesc')}
                      </p>
                    </div>
                    <div>
                      <FormLabel htmlFor="dateOfBirth">{t('auth.profile.dateOfBirth')}</FormLabel>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        max={today}
                        {...register('dateOfBirth')}
                      />
                    </div>
                    <div>
                      <FormLabel htmlFor="heightCm">{t('auth.profile.height')}</FormLabel>
                      <Input
                        id="heightCm"
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="cm"
                        {...register('heightCm')}
                      />
                      {errors.heightCm && (
                        <p className="text-xs text-destructive">{errors.heightCm.message}</p>
                      )}
                    </div>
                    <div>
                      <FormLabel htmlFor="currentWeightKg">{t('auth.profile.weight')}</FormLabel>
                      <Input
                        id="currentWeightKg"
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="kg"
                        {...register('currentWeightKg')}
                      />
                      {errors.currentWeightKg && (
                        <p className="text-xs text-destructive">{errors.currentWeightKg.message}</p>
                      )}
                    </div>
                    <div>
                      <FormLabel htmlFor="goal">{t('auth.profile.goal')}</FormLabel>
                      <select
                        id="goal"
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...register('goal')}
                      >
                        <option value="">{t('auth.profile.goalUnset')}</option>
                        {TRAINEE_GOALS.map((g) => (
                          <option key={g} value={g}>
                            {t(`pt.goals.${g}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FormLabel htmlFor="injuryHistory">{t('auth.profile.injuryHistory')}</FormLabel>
                      <textarea
                        id="injuryHistory"
                        rows={3}
                        className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...register('injuryHistory')}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!isDirty || isSubmitting}>
                  {isSubmitting ? t('auth.profile.submitting') : t('auth.profile.submit')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};
