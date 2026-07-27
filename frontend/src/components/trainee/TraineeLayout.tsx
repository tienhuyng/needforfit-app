import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, History, Scale, Dumbbell, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { clearAuth, getAuthUser } from '@/utils/auth-storage';

interface TraineeLayoutProps {
  children: React.ReactNode;
  title?: string;
  hideNav?: boolean;
}

const navItems = [
  { to: '/trainee/home', icon: Home, labelKey: 'trainee.nav.home' },
  { to: '/trainee/programs', icon: Dumbbell, labelKey: 'trainee.nav.programs' },
  { to: '/trainee/history', icon: History, labelKey: 'trainee.nav.history' },
  { to: '/trainee/metrics', icon: Scale, labelKey: 'trainee.nav.metrics' },
] as const;

export const TraineeLayout: React.FC<TraineeLayoutProps> = ({
  children,
  title,
  hideNav = false,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const user = getAuthUser();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  const confirmLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-6">
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between sm:max-w-2xl">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">FitHub</p>
              <h1 className="text-base font-semibold leading-tight">
                {title ?? t('trainee.layout.title')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/settings/profile"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent"
              aria-label={t('auth.profile.title')}
              title={t('auth.profile.title')}
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent"
              aria-label={t('trainee.layout.logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {displayName && (
          <p className="mx-auto mt-1 max-w-lg truncate text-xs text-muted-foreground sm:max-w-2xl">
            {displayName}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-lg p-4 sm:max-w-2xl">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card sm:hidden">
          <div className="mx-auto flex max-w-lg justify-around">
            {navItems.map(({ to, icon: Icon, labelKey }) => {
              const isActive =
                location.pathname === to ||
                (to === '/trainee/history' && location.pathname.startsWith('/trainee/workouts')) ||
                (to === '/trainee/metrics' && location.pathname.startsWith('/trainee/metrics'));

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <LogoutConfirmModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};
