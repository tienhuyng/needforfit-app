import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/template';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  to?: string;
  labelKey?: string;
  className?: string;
  onClick?: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  labelKey = 'common.back',
  className,
  onClick,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = t(labelKey);

  const content = (
    <>
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </>
  );

  if (to) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className={cn('gap-1 self-start', className)}
        asChild
      >
        <Link to={to}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn('gap-1 self-start', className)}
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }
        navigate(-1);
      }}
    >
      {content}
    </Button>
  );
};
