import React from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { FormLabel } from '@/components/common/FormLabel';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Shows a required marker on the label (use with zod-required fields). */
  labelRequired?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, labelRequired, className = '', id, name, required, ...props }, ref) => {
    const inputId = id ?? name;
    const showRequired = labelRequired ?? required;

    return (
      <div className="space-y-2">
        {label && (
          <FormLabel htmlFor={inputId} required={showRequired}>
            {label}
          </FormLabel>
        )}

        <ShadcnInput
          ref={ref}
          id={inputId}
          name={name}
          required={required}
          aria-required={showRequired ? true : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />

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

Input.displayName = 'Input';
