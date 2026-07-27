import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PTLayout } from '@/components/pt/PTLayout';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/template';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { ProgramSummary } from '@/types/pt';

export const ProgramListPage: React.FC = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setError('');
      setIsLoading(true);
      try {
        setPrograms(await ptApi.getPrograms());
      } catch (err) {
        setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <PTLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('pt.programList.title')}</h2>
            <p className="text-muted-foreground">{t('pt.programList.subtitle')}</p>
          </div>
          <Button asChild>
            <Link to="/pt/programs/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('pt.programList.create')}
            </Link>
          </Button>
        </div>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <p className="text-muted-foreground">{t('pt.common.loading')}</p>
        ) : programs.length === 0 ? (
          <p className="text-muted-foreground">{t('pt.programList.empty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pt.programs.name')}</TableHead>
                  <TableHead>{t('pt.programs.type')}</TableHead>
                  <TableHead>{t('pt.programs.status')}</TableHead>
                  <TableHead>{t('pt.programList.sessions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to={`/pt/programs/${p.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>{t(`pt.programTypes.${p.programType}`)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`pt.programStatuses.${p.status}`)}</Badge>
                    </TableCell>
                    <TableCell>{p.sessionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PTLayout>
  );
};
