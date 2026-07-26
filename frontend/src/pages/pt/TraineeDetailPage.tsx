import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PTLayout } from '@/components/pt/PTLayout';
import { Alert } from '@/components/common/Alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/template';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { TraineeDetailResponse } from '@/types/pt';

function formatName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '—';
}

export const TraineeDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [trainee, setTrainee] = useState<TraineeDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setError('');
      setIsLoading(true);
      try {
        const data = await ptApi.getTrainee(id);
        setTrainee(data);
      } catch (err) {
        setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [id]);

  return (
    <PTLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pt/trainees">{t('pt.trainees.backToList')}</Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">
              {trainee ? formatName(trainee.firstName, trainee.lastName) : t('pt.trainees.detail')}
            </h2>
          </div>
          {trainee && (
            <Badge variant={trainee.assignmentStatus === 'active' ? 'success' : 'secondary'}>
              {t(`pt.statuses.${trainee.assignmentStatus}`)}
            </Badge>
          )}
        </div>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('pt.common.loading')}</p>
        ) : trainee ? (
          <Tabs defaultValue="profile">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="profile">{t('pt.tabs.profile')}</TabsTrigger>
              <TabsTrigger value="programs">{t('pt.tabs.programs')}</TabsTrigger>
              <TabsTrigger value="history">{t('pt.tabs.history')}</TabsTrigger>
              <TabsTrigger value="metrics">{t('pt.tabs.metrics')}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pt.tabs.profile')}</CardTitle>
                  <CardDescription>{t('pt.trainees.profileDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.columns.email')}</p>
                    <p className="font-medium">{trainee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.phone')}</p>
                    <p className="font-medium">{trainee.phone ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.columns.age')}</p>
                    <p className="font-medium">{trainee.age ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.columns.goal')}</p>
                    <p className="font-medium">
                      {trainee.goal ? t(`pt.goals.${trainee.goal}`) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.height')}</p>
                    <p className="font-medium">
                      {trainee.heightCm ? `${trainee.heightCm} cm` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.weight')}</p>
                    <p className="font-medium">
                      {trainee.currentWeightKg ? `${trainee.currentWeightKg} kg` : '—'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">{t('pt.trainees.injuryHistory')}</p>
                    <p className="font-medium">{trainee.injuryHistory ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="programs">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pt.tabs.programs')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {trainee.programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('pt.programs.empty')}</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('pt.programs.name')}</TableHead>
                            <TableHead>{t('pt.programs.type')}</TableHead>
                            <TableHead>{t('pt.programs.status')}</TableHead>
                            <TableHead>{t('pt.programs.assignedAt')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainee.programs.map((program) => (
                            <TableRow key={program.id}>
                              <TableCell className="font-medium">{program.name}</TableCell>
                              <TableCell>{t(`pt.programTypes.${program.programType}`)}</TableCell>
                              <TableCell>{t(`pt.programStatuses.${program.status}`)}</TableCell>
                              <TableCell>
                                {new Date(program.assignedAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pt.tabs.history')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {trainee.workoutHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('pt.history.empty')}</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('pt.history.session')}</TableHead>
                            <TableHead>{t('pt.history.program')}</TableHead>
                            <TableHead>{t('pt.history.date')}</TableHead>
                            <TableHead>{t('pt.history.completion')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainee.workoutHistory.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.sessionName}</TableCell>
                              <TableCell>{item.programName}</TableCell>
                              <TableCell>{item.workoutDate}</TableCell>
                              <TableCell>{item.completionPercent}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pt.tabs.metrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {trainee.metrics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('pt.metrics.empty')}</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('pt.metrics.date')}</TableHead>
                            <TableHead>{t('pt.metrics.weight')}</TableHead>
                            <TableHead>{t('pt.metrics.bodyFat')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainee.metrics.map((metric) => (
                            <TableRow key={metric.id}>
                              <TableCell>{metric.measurementDate}</TableCell>
                              <TableCell>{metric.weightKg} kg</TableCell>
                              <TableCell>
                                {metric.bodyFatPercent != null ? `${metric.bodyFatPercent}%` : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </PTLayout>
  );
};
