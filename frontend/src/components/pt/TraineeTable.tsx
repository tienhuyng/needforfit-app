import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AssignmentStatus, TraineeGoal, TraineeListItem } from '@/types/pt';

export interface TraineeTableRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  age: number | null;
  goal: TraineeGoal | null;
  status: AssignmentStatus;
  activePrograms?: number;
}

interface TraineeTableProps {
  trainees: TraineeTableRow[];
  showPrograms?: boolean;
  emptyMessage?: string;
}

function formatName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '—';
}

function statusVariant(status: AssignmentStatus): 'success' | 'warning' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'secondary';
}

export const TraineeTable: React.FC<TraineeTableProps> = ({
  trainees,
  showPrograms = false,
  emptyMessage,
}) => {
  const { t } = useTranslation();

  if (trainees.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? t('pt.trainees.empty')}
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('pt.trainees.columns.name')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('pt.trainees.columns.email')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('pt.trainees.columns.age')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('pt.trainees.columns.goal')}</TableHead>
            {showPrograms && (
              <TableHead className="hidden md:table-cell">
                {t('pt.trainees.columns.programs')}
              </TableHead>
            )}
            <TableHead>{t('pt.trainees.columns.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trainees.map((trainee) => (
            <TableRow key={trainee.id}>
              <TableCell>
                <Link
                  to={`/pt/trainees/${trainee.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {formatName(trainee.firstName, trainee.lastName)}
                </Link>
                <span className="block text-xs text-muted-foreground sm:hidden">
                  {trainee.email}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{trainee.email}</TableCell>
              <TableCell className="hidden md:table-cell">
                {trainee.age ?? '—'}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {trainee.goal ? t(`pt.goals.${trainee.goal}`) : '—'}
              </TableCell>
              {showPrograms && (
                <TableCell className="hidden md:table-cell">
                  {(trainee as TraineeListItem).activePrograms ?? '—'}
                </TableCell>
              )}
              <TableCell>
                <Badge variant={statusVariant(trainee.status)}>
                  {t(`pt.statuses.${trainee.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
