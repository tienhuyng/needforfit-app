import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ProfileSettingsPage } from '@/pages/auth/ProfileSettingsPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardPage } from '@/pages/pt/DashboardPage';
import { TraineeListPage } from '@/pages/pt/TraineeListPage';
import { TraineeDetailPage } from '@/pages/pt/TraineeDetailPage';
import { ProgramListPage } from '@/pages/pt/ProgramListPage';
import { ProgramDetailPage } from '@/pages/pt/ProgramDetailPage';
import { CreateProgramPage } from '@/pages/pt/CreateProgramPage';
import { CreateSessionPage } from '@/pages/pt/CreateSessionPage';
import { EditSessionPage } from '@/pages/pt/EditSessionPage';
import { AddExercisesPage } from '@/pages/pt/AddExercisesPage';
import { HomePage } from '@/pages/trainee/HomePage';
import { MyProgramsPage } from '@/pages/trainee/MyProgramsPage';
import { ProgramSessionsPage, TraineeSessionDetailPage } from '@/pages/trainee/ProgramSessionsPage';
import { LogWorkoutPage } from '@/pages/trainee/LogWorkoutPage';
import { WorkoutHistoryPage } from '@/pages/trainee/WorkoutHistoryPage';
import { WorkoutDetailPage } from '@/pages/trainee/WorkoutDetailPage';
import { BodyMetricsPage } from '@/pages/trainee/BodyMetricsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/trainee/home" replace />} />

        <Route
          path="/trainee/home"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/programs"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <MyProgramsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/programs/:programId"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <ProgramSessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/programs/:programId/sessions/:sessionId"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <TraineeSessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/log/:sessionId"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <LogWorkoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/history"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <WorkoutHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/workouts/:id"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <WorkoutDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainee/metrics"
          element={
            <ProtectedRoute allowedRoles={['trainee']}>
              <BodyMetricsPage />
            </ProtectedRoute>
          }
        />

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
          path="/pt/programs"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <ProgramListPage />
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
          path="/pt/programs/:programId"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <ProgramDetailPage />
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
          path="/pt/programs/:programId/sessions/:sessionId/edit"
          element={
            <ProtectedRoute allowedRoles={['pt', 'admin']}>
              <EditSessionPage />
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
