import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { LogWorkoutPage } from '@/pages/trainee/LogWorkoutPage';

vi.mock('@/services/trainee.service', () => ({
  traineeApi: {
    getSession: vi.fn().mockResolvedValue({
      sessionId: 's1',
      programId: 'p1',
      programName: 'Strength Plan',
      sessionName: 'Day 1',
      scheduledDate: '2026-07-26',
      sessionType: 'strength',
      canLog: true,
      isLocked: false,
      existingLogId: null,
      exercises: [
        {
          id: 'e1',
          exerciseName: 'Squat',
          plannedSets: 3,
          plannedReps: 10,
          plannedWeightKg: 60,
          restSeconds: 90,
          notes: null,
        },
      ],
    }),
    logWorkout: vi.fn(),
  },
  getApiErrorMessage: vi.fn(() => 'Error'),
}));

const renderLogWorkout = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/trainee/log/s1']}>
        <Routes>
          <Route path="/trainee/log/:sessionId" element={<LogWorkoutPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );

describe('LogWorkoutPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders exercise and feedback sections when session is open', async () => {
    renderLogWorkout();

    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });
    expect(screen.getByText(/workout feedback/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit workout log/i })).toBeInTheDocument();
  });
});
