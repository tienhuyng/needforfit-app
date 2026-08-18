import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-start md:items-center p-8 bg-background">
      <div className="w-full max-w-sm mx-auto mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Needforfit</h1>
        <p className="text-sm text-muted-foreground mt-1">Fitness Coaching Platform</p>
      </div>
      {children}
    </div>
  );
};
