import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { HomePage } from '@/pages/trainee/HomePage';

vi.mock('@/services/trainee.service', () => ({
  traineeApi: {
    getHome: vi.fn().mockResolvedValue({
      todayWorkout: {
        sessionId: 's1',
        programId: 'p1',
        programName: 'Strength Plan',
        sessionName: 'Day 1',
        scheduledDate: '2026-07-26',
        exerciseCount: 3,
        canLog: true,
        isLocked: false,
        existingLogId: null,
      },
      upcomingWorkouts: [],
      recentHistory: [],
      weightTrend: [{ date: '2026-07-20', weightKg: 70 }],
      activePrograms: [{ id: 'p1', name: 'Strength Plan', programType: 'strength', status: 'active', sessionCount: 5 }],
    }),
  },
  getApiErrorMessage: vi.fn(() => 'Error'),
}));

const renderHome = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('HomePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders today workout widget with log button', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Day 1')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /log workout/i })).toBeInTheDocument();
    expect(screen.getByText(/weight trend/i)).toBeInTheDocument();
  });
});
