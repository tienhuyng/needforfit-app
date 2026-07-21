import React from 'react';

interface AlertProps {
  type: 'error' | 'success';
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message }) => {
  const styles =
    type === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-green-50 border-green-200 text-green-700';

  return (
    <div
      className={`mb-4 p-4 border rounded-lg text-sm ${styles}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
};
