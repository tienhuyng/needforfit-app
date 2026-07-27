import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/template';
import { Badge } from '@/components/ui/badge';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { TraineeProgramItem } from '@/types/trainee';

export const MyProgramsPage: React.FC = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<TraineeProgramItem[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setError('');
      setIsLoading(true);
      try {
        setPrograms(await traineeApi.getPrograms());
      } catch (err) {
        setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <TraineeLayout title={t('trainee.programs.title')}>
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : programs.length === 0 ? (
          <p className="text-muted-foreground">{t('trainee.programs.empty')}</p>
        ) : (
          programs.map((p) => (
            <Link key={p.id} to={`/trainee/programs/${p.id}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge variant="secondary">{p.progressPercent}%</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{p.ptName}</p>
                  <p>
                    {t(`pt.programTypes.${p.programType}`)} · {p.completedCount}/{p.sessionCount}{' '}
                    {t('trainee.programs.sessionsDone')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </TraineeLayout>
  );
};
