import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from '@/components/ui/button';

type TemplateVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<ShadcnButtonProps, 'variant'> {
  variant?: TemplateVariant;
  isLoading?: boolean;
}

const variantMap: Record<TemplateVariant, NonNullable<ShadcnButtonProps['variant']>> = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
  ghost: 'ghost',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading = false, children, disabled, className, ...props }, ref) => {
    return (
      <ShadcnButton
        ref={ref}
        variant={variantMap[variant]}
        disabled={disabled || isLoading}
        className={className}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </ShadcnButton>
    );
  }
);

Button.displayName = 'Button';
