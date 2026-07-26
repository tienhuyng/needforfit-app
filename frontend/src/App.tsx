import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardPage } from '@/pages/pt/DashboardPage';
import { TraineeListPage } from '@/pages/pt/TraineeListPage';
import { TraineeDetailPage } from '@/pages/pt/TraineeDetailPage';
import { CreateProgramPage } from '@/pages/pt/CreateProgramPage';
import { CreateSessionPage } from '@/pages/pt/CreateSessionPage';
import { AddExercisesPage } from '@/pages/pt/AddExercisesPage';

const HomePlaceholder: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <p className="text-gray-600">Dashboard coming soon</p>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<HomePlaceholder />} />

        <Route
          path="/pt/dashboard"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pt/trainees"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <TraineeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pt/trainees/:id"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <TraineeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pt/programs/new"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <CreateProgramPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pt/programs/:programId/sessions/new"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <CreateSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pt/programs/:programId/sessions/:sessionId/exercises"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <AddExercisesPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
