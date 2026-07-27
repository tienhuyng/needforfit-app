import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputProps } from '@/components/template/Input';
import { cn } from '@/lib/utils';

export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, name, ...props }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const inputId = id ?? name;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className="text-sm font-semibold">
            {label}
          </Label>
        )}

        <div className="relative">
          <ShadcnInput
            ref={ref}
            id={inputId}
            name={name}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            {...props}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? t('auth.common.hidePassword') : t('auth.common.showPassword')}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
