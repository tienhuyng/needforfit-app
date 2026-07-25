import React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  type: 'error' | 'success';
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message }) => {
  return (
    <div
      className={cn(
        'mb-4 rounded-lg border p-4 text-sm',
        type === 'error'
          ? 'border-destructive/50 bg-destructive/10 text-destructive'
          : 'border-green-200 bg-green-50 text-green-800'
      )}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
};
