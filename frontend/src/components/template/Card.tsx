import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
