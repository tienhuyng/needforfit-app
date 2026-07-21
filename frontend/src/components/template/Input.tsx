import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id ?? props.name;

    const baseClass =
      'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors text-base';
    const borderClass = error
      ? 'border-red-500 bg-red-50'
      : 'border-gray-300 bg-white hover:border-gray-400';

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`${baseClass} ${borderClass} ${className}`}
          {...props}
        />

        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-500 font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && <p className="text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
