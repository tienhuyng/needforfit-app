import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { MyProgramsPage } from '@/pages/trainee/MyProgramsPage';

vi.mock('@/services/trainee.service', () => ({
  traineeApi: {
    getPrograms: vi.fn().mockResolvedValue([
      {
        id: 'p1',
        name: 'Hypertrophy Block',
        programType: 'strength',
        status: 'active',
        ptName: 'Coach Mike',
        progressPercent: 40,
        sessionCount: 5,
        completedCount: 2,
      },
    ]),
  },
  getApiErrorMessage: vi.fn(() => 'Error'),
}));

describe('MyProgramsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders assigned programs with progress', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <MyProgramsPage />
        </MemoryRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Hypertrophy Block')).toBeInTheDocument();
    });
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText(/Coach Mike/)).toBeInTheDocument();
  });
});
