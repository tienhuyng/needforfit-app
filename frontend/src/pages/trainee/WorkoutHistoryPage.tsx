import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { Button, Input } from '@/components/template';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { TraineeProgramItem, WorkoutHistorySummary } from '@/types/trainee';

export const WorkoutHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<WorkoutHistorySummary[]>([]);
  const [programs, setPrograms] = useState<TraineeProgramItem[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [programId, setProgramId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = async () => {
    setError('');
    setIsLoading(true);
    try {
      const [history, programList] = await Promise.all([
        traineeApi.getWorkoutHistory({
          programId: programId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        traineeApi.getPrograms(),
      ]);
      setItems(history.items);
      setPrograms(programList);
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TraineeLayout title={t('trainee.history.title')}>
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">{t('trainee.history.filters')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="program">{t('trainee.history.program')}</Label>
              <select
                id="program"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="">{t('trainee.history.allPrograms')}</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="from">{t('trainee.history.fromDate')}</Label>
              <Input
                id="from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to">{t('trainee.history.toDate')}</Label>
              <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <Button type="button" onClick={() => void load()}>
            {t('trainee.history.apply')}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">{t('trainee.history.empty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trainee.history.date')}</TableHead>
                  <TableHead>{t('trainee.history.program')}</TableHead>
                  <TableHead>{t('trainee.history.exercises')}</TableHead>
                  <TableHead>{t('trainee.history.feedback')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        to={`/trainee/workouts/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.workoutDate}
                      </Link>
                    </TableCell>
                    <TableCell>{row.programName}</TableCell>
                    <TableCell>{row.exerciseCount}</TableCell>
                    <TableCell>
                      {row.difficultyRating != null
                        ? `${row.difficultyRating}/10`
                        : t('trainee.history.noFeedback')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TraineeLayout>
  );
};
