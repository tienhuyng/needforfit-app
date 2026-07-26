import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { DashboardPage } from '@/pages/pt/DashboardPage';

vi.mock('@/services/pt.service', () => ({
  ptApi: {
    getDashboard: vi.fn().mockResolvedValue({
      kpis: { trainees: 5, programs: 3, workoutsThisWeek: 12 },
      trainees: [],
      recentActivity: [],
    }),
  },
  getApiErrorMessage: vi.fn(() => 'Error'),
}));

const renderDashboard = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('DashboardPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('renders KPI labels', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
    expect(screen.getByText(/học viên đang hoạt động/i)).toBeInTheDocument();
    expect(screen.getByText(/buổi tập tuần này/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
