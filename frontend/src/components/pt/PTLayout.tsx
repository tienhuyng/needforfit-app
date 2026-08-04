import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Users, Dumbbell, Menu, X, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { clearAuth, getAuthUser } from '@/utils/auth-storage';

interface PTLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/pt/dashboard', icon: LayoutDashboard, labelKey: 'pt.nav.dashboard' },
  { to: '/pt/trainees', icon: Users, labelKey: 'pt.nav.trainees' },
  { to: '/pt/programs', icon: Dumbbell, labelKey: 'pt.nav.programs' },
] as const;

export const PTLayout: React.FC<PTLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const user = getAuthUser();

  const confirmLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          aria-label={t('pt.layout.closeMenu')}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 sm:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-lg font-bold text-primary">FitHub PT</span>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('pt.layout.closeMenu')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, icon: Icon, labelKey }) => {
            const isActive =
              location.pathname === to ||
              (to === '/pt/trainees' && location.pathname.startsWith('/pt/trainees')) ||
              (to === '/pt/programs' &&
                (location.pathname.startsWith('/pt/programs') ||
                  location.pathname.includes('/sessions')));

            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            {t('pt.layout.logout')}
          </Button>
        </div>
      </aside>

      <div className="sm:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('pt.layout.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">{t('pt.layout.title')}</h1>
            {displayName && (
              <Link
                to="/settings/profile"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                title={t('auth.profile.title')}
              >
                <Settings className="h-4 w-4" />
                <span>{displayName}</span>
              </Link>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 [--page-sticky-top:4rem]">{children}</main>
      </div>

      <LogoutConfirmModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};
