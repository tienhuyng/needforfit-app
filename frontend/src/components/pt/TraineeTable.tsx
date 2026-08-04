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
import { Button } from '@/components/template';
import { AssignmentStatus, TraineeGoal, TraineeListItem } from '@/types/pt';

export interface TraineeTableRow {
  assignmentId?: string;
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
  onResendInvite?: (assignmentId: string) => Promise<void>;
  onCancelInvite?: (assignmentId: string) => Promise<void>;
}

function formatName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '—';
}

function statusVariant(
  status: AssignmentStatus
): 'success' | 'warning' | 'secondary' | 'default' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'invite_pending') return 'default';
  return 'secondary';
}

export const TraineeTable: React.FC<TraineeTableProps> = ({
  trainees,
  showPrograms = false,
  emptyMessage,
  onResendInvite,
  onCancelInvite,
}) => {
  const { t } = useTranslation();
  const showActions = Boolean(onResendInvite || onCancelInvite);

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
            {showActions && <TableHead>{t('pt.trainees.columns.actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {trainees.map((trainee) => (
            <TableRow key={trainee.assignmentId ?? trainee.id}>
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
              <TableCell className="hidden md:table-cell">{trainee.age ?? '—'}</TableCell>
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
              {showActions && (
                <TableCell>
                  {trainee.status === 'invite_rejected' && trainee.assignmentId && onResendInvite && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void onResendInvite(trainee.assignmentId!)}
                      >
                        {t('pt.invite.resend')}
                      </Button>
                      {onCancelInvite && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void onCancelInvite(trainee.assignmentId!)}
                        >
                          {t('pt.invite.cancel')}
                        </Button>
                      )}
                    </div>
                  )}
                  {trainee.status === 'invite_pending' && trainee.assignmentId && onCancelInvite && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void onCancelInvite(trainee.assignmentId!)}
                    >
                      {t('pt.invite.cancel')}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
