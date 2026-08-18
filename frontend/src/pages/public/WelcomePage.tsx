import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dumbbell, UserCircle, UtensilsCrossed, Calculator, BookOpen } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/template';
import { Badge } from '@/components/ui/badge';

function SoonStamp() {
  const { t } = useTranslation();
  return (
    <Badge variant="secondary" className="absolute right-3 top-3 text-[10px] uppercase tracking-wide">
      {t('public.availableSoon')}
    </Badge>
  );
}

export const WelcomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Needforfit</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('public.tagline')}</p>
        </div>

        <div className="grid gap-4">
          <Card className="border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Dumbbell className="h-10 w-10 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">{t('public.memberCardTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('public.memberCardDesc')}</p>
              </div>
              <Button asChild size="lg" className="h-12 w-full max-w-xs text-base">
                <Link to="/login">{t('public.memberCardCta')}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="relative transition-colors hover:bg-muted/40">
            <SoonStamp />
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <UserCircle className="h-10 w-10 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">{t('public.freeMemberCardTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('public.freeMemberCardDesc')}</p>
              </div>
              <Button asChild variant="secondary" size="lg" className="h-12 w-full max-w-xs text-base">
                <Link to="/available-soon">{t('public.freeMemberCardCta')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
            {t('public.freeToolsTitle')}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: UtensilsCrossed, label: t('public.mealPlanner') },
              { icon: Calculator, label: t('public.bmiCalculator') },
              { icon: BookOpen, label: t('public.workoutReference') },
            ].map(({ icon: Icon, label }) => (
              <Link key={label} to="/available-soon" className="block">
                <Card className="relative h-full transition-colors hover:bg-muted/40">
                  <SoonStamp />
                  <CardContent className="flex flex-col items-center gap-2 p-4 pt-8 text-center">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium">{label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.register.noAccount')}{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t('auth.register.title')}
          </Link>
        </p>
      </div>
    </div>
  );
};
