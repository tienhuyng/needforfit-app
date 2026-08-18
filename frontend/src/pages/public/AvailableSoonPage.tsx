import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/template';

export const AvailableSoonPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold">{t('public.availableSoonTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('public.availableSoonDesc')}</p>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/">{t('public.backToHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
