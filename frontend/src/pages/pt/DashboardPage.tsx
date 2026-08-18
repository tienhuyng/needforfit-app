import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Dumbbell, CalendarCheck } from 'lucide-react';
import { PTLayout } from '@/components/pt/PTLayout';
import { PageStickyHeader } from '@/components/common/PageStickyHeader';
import { StatCard } from '@/components/pt/StatCard';
import { TraineeTable } from '@/components/pt/TraineeTable';
import { Alert } from '@/components/common/Alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/template';
import { Button } from '@/components/template';
import { Badge } from '@/components/ui/badge';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { PtActivityItem, PtDashboardResponse } from '@/types/pt';

const activityTagVariant = (tag: string): 'default' | 'secondary' | 'success' | 'warning' => {
  if (tag === 'workout_log') return 'success';
  if (tag === 'program_created') return 'default';
  if (tag === 'invite_accepted') return 'success';
  if (tag === 'invite_rejected') return 'warning';
  return 'secondary';
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<PtDashboardResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setError('');
      setIsLoading(true);
      try {
        const dashboard = await ptApi.getDashboard();
        setData(dashboard);
      } catch (err) {
        setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const formatActivityTime = (item: PtActivityItem) => {
    return new Date(item.occurredAt).toLocaleString();
  };

  return (
    <PTLayout>
      <PageStickyHeader
        title={t('pt.dashboard.title')}
        subtitle={t('pt.dashboard.subtitle')}
      />

      <div className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('pt.common.loading')}</p>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('pt.dashboard.kpi.trainees')}
                value={data.kpis.trainees}
                icon={Users}
                href="/pt/trainees"
              />
              <StatCard
                title={t('pt.dashboard.kpi.programs')}
                value={data.kpis.programs}
                icon={Dumbbell}
                href="/pt/programs"
              />
              <StatCard
                title={t('pt.dashboard.kpi.workoutsThisWeek')}
                value={data.kpis.workoutsThisWeek}
                icon={CalendarCheck}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('pt.dashboard.recentTrainees')}</CardTitle>
                  <CardDescription>{t('pt.dashboard.recentTraineesDesc')}</CardDescription>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/pt/trainees">{t('pt.dashboard.viewAll')}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <TraineeTable trainees={data.trainees} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('pt.dashboard.recentActivity')}</CardTitle>
                <CardDescription>{t('pt.dashboard.recentActivityDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('pt.dashboard.noActivity')}</p>
                ) : (
                  <ul className="space-y-3">
                    {data.recentActivity.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={activityTagVariant(item.tag)}>
                              {t(`pt.dashboard.activityTags.${item.tag}`, {
                                defaultValue: item.tag,
                              })}
                            </Badge>
                            <p className="font-medium">{item.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatActivityTime(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PTLayout>
  );
};
