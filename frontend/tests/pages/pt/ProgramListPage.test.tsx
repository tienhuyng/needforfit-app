import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { ProgramListPage } from '@/pages/pt/ProgramListPage';

vi.mock('@/services/pt.service', () => ({
  ptApi: {
    getPrograms: vi.fn().mockResolvedValue([
      {
        id: 'p1',
        name: 'Strength Plan',
        objective: null,
        programType: 'strength',
        durationWeeks: 8,
        status: 'active',
        sessionCount: 3,
        createdAt: '2026-01-01',
      },
    ]),
  },
  getApiErrorMessage: vi.fn(() => 'Error'),
}));

describe('ProgramListPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders program list', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ProgramListPage />
        </MemoryRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Strength Plan')).toBeInTheDocument();
    });
  });
});
