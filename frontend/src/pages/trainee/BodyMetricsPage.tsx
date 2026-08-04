import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
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
import { FormLabel } from '@/components/common/FormLabel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LineChart } from '@/components/ui/line-chart';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { MetricsProgressResponse } from '@/types/trainee';
import {
  createLogMetricSchema,
  LogMetricFormData,
  toLogMetricPayload,
} from '@/utils/trainee-validation';

export const BodyMetricsPage: React.FC = () => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<MetricsProgressResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const schema = createLogMetricSchema(t);
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogMetricFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      measurementDate: today,
      bodyFatPercent: undefined,
      muscleMassKg: undefined,
      notes: '',
    },
  });

  const loadProgress = async () => {
    setError('');
    setIsLoading(true);
    try {
      setProgress(await traineeApi.getMetricsProgress());
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProgress();
  }, []);

  const onSubmit = async (data: LogMetricFormData) => {
    setError('');
    setSuccess('');
    try {
      await traineeApi.logMetric(toLogMetricPayload(data));
      setSuccess(t('trainee.messages.metricSuccess'));
      reset({ measurementDate: today, bodyFatPercent: undefined, muscleMassKg: undefined, notes: '' });
      await loadProgress();
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.submitFailed'));
    }
  };

  return (
    <TraineeLayout title={t('trainee.metrics.title')}>
      <Tabs defaultValue="log" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="log">{t('trainee.metrics.logTab')}</TabsTrigger>
          <TabsTrigger value="progress">{t('trainee.metrics.progressTab')}</TabsTrigger>
        </TabsList>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <TabsContent value="log">
          <Card>
            <CardHeader>
              <CardTitle>{t('trainee.metrics.logTitle')}</CardTitle>
              <CardDescription>{t('trainee.metrics.logDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <FormLabel htmlFor="date" required>
                    {t('trainee.metrics.date')}
                  </FormLabel>
                  <Input id="date" type="date" max={today} {...register('measurementDate')} />
                  {errors.measurementDate && (
                    <p className="text-xs text-destructive">{errors.measurementDate.message}</p>
                  )}
                </div>
                <div>
                  <FormLabel htmlFor="weight" required>
                    {t('trainee.metrics.weight')}
                  </FormLabel>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min={0}
                    {...register('weightKg')}
                  />
                  {errors.weightKg && (
                    <p className="text-xs text-destructive">{errors.weightKg.message}</p>
                  )}
                </div>
                <div>
                  <FormLabel htmlFor="bodyFat">{t('trainee.metrics.bodyFat')}</FormLabel>
                  <Input id="bodyFat" type="number" step="0.1" min={0} {...register('bodyFatPercent')} />
                </div>
                <div>
                  <FormLabel htmlFor="muscle">{t('trainee.metrics.muscleMass')}</FormLabel>
                  <Input id="muscle" type="number" step="0.1" min={0} {...register('muscleMassKg')} />
                </div>
                <div>
                  <FormLabel htmlFor="metricNotes">{t('trainee.metrics.notes')}</FormLabel>
                  <Input id="metricNotes" {...register('notes')} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t('trainee.metrics.submitting') : t('trainee.metrics.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          {isLoading ? (
            <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
          ) : progress ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t('trainee.metrics.latest')}</p>
                    <p className="text-xl font-bold">
                      {progress.stats.latestWeight ?? '—'}
                      {progress.stats.latestWeight != null && ' kg'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t('trainee.metrics.start')}</p>
                    <p className="text-xl font-bold">
                      {progress.stats.startWeight ?? '—'}
                      {progress.stats.startWeight != null && ' kg'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t('trainee.metrics.change')}</p>
                    <p className="text-xl font-bold">
                      {progress.stats.changeKg != null
                        ? `${progress.stats.changeKg > 0 ? '+' : ''}${progress.stats.changeKg.toFixed(1)} kg`
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t('trainee.metrics.entries')}</p>
                    <p className="text-xl font-bold">{progress.stats.entryCount}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('trainee.metrics.chartTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={progress.chartData.map((p) => ({ date: p.date, value: p.weightKg }))}
                    valueLabel={t('trainee.metrics.weightKg')}
                    height={200}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('trainee.metrics.historyTable')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {progress.entries.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">{t('trainee.metrics.empty')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('trainee.metrics.date')}</TableHead>
                            <TableHead>{t('trainee.metrics.weight')}</TableHead>
                            <TableHead>{t('trainee.metrics.bodyFat')}</TableHead>
                            <TableHead>{t('trainee.metrics.muscleMass')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {progress.entries.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>{e.measurementDate}</TableCell>
                              <TableCell>{e.weightKg} kg</TableCell>
                              <TableCell>
                                {e.bodyFatPercent != null ? `${e.bodyFatPercent}%` : '—'}
                              </TableCell>
                              <TableCell>
                                {e.muscleMassKg != null ? `${e.muscleMassKg} kg` : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </TraineeLayout>
  );
};
