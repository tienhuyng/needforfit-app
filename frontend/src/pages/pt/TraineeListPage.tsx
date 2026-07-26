import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PTLayout } from '@/components/pt/PTLayout';
import { TraineeTable } from '@/components/pt/TraineeTable';
import { Alert } from '@/components/common/Alert';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/template';
import { Label } from '@/components/ui/label';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { AssignmentStatus, PaginatedResponse, TraineeListItem } from '@/types/pt';
import { cn } from '@/lib/utils';

export const TraineeListPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AssignmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<TraineeListItem> | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const limit = 10;

  const loadTrainees = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await ptApi.getTrainees({
        search: search || undefined,
        status: status || undefined,
        page,
        limit,
      });
      setData(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    void loadTrainees();
  }, [loadTrainees]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadTrainees();
  };

  return (
    <PTLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('pt.trainees.title')}</h2>
          <p className="text-muted-foreground">{t('pt.trainees.subtitle')}</p>
        </div>

        {error && <Alert type="error" message={error} />}

        <Card>
          <CardHeader>
            <CardTitle>{t('pt.trainees.filters')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label={t('pt.trainees.search')}
                  placeholder={t('pt.trainees.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:w-48">
                <Label htmlFor="status">{t('pt.trainees.statusFilter')}</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as AssignmentStatus | '');
                    setPage(1);
                  }}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">{t('pt.trainees.allStatuses')}</option>
                  <option value="active">{t('pt.statuses.active')}</option>
                  <option value="paused">{t('pt.statuses.paused')}</option>
                  <option value="ended">{t('pt.statuses.ended')}</option>
                </select>
              </div>
              <Button type="submit" variant="primary">
                {t('pt.trainees.applyFilters')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-muted-foreground">{t('pt.common.loading')}</p>
            ) : data ? (
              <>
                <TraineeTable trainees={data.items} showPrograms />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('pt.trainees.pagination', {
                      from: data.total === 0 ? 0 : (data.page - 1) * data.limit + 1,
                      to: Math.min(data.page * data.limit, data.total),
                      total: data.total,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t('pt.common.previous')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t('pt.common.next')}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PTLayout>
  );
};
