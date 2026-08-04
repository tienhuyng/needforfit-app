import React from 'react';
import { BackButton } from '@/components/common/BackButton';
import { cn } from '@/lib/utils';

export interface PageStickyHeaderProps {
  /** Link target for the back control */
  backTo?: string;
  /** i18n key for back label (defaults to common.back) */
  backLabelKey?: string;
  /** Custom back row (overrides backTo) */
  back?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Primary actions (e.g. Create, Invite) shown beside the title on larger screens */
  actions?: React.ReactNode;
  /** Extra content aligned to the end (e.g. status badge) */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Sticks below the app chrome (PT/Trainee top bar). Parent layout should set
 * `--page-sticky-top` on `<main>` (defaults to 4rem).
 */
export const PageStickyHeader: React.FC<PageStickyHeaderProps> = ({
  backTo,
  backLabelKey,
  back,
  title,
  subtitle,
  actions,
  trailing,
  className,
}) => {
  const showBack = Boolean(back ?? backTo);

  return (
    <div
      className={cn(
        'sticky z-20 -mx-4 mb-4 border-b bg-background/95 px-4 pb-4 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:-mx-6 sm:px-6',
        'top-[var(--page-sticky-top,4rem)]',
        className
      )}
    >
      {showBack && (
        <div className="mb-2">
          {back ?? (
            <BackButton to={backTo} labelKey={backLabelKey ?? 'common.back'} className="mb-0" />
          )}
        </div>
      )}

      {(title || subtitle || actions || trailing) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
            )}
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          </div>
          {(actions || trailing) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
              {trailing}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
