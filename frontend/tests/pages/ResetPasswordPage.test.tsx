import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

vi.mock('@/services/auth.service', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
  getApiErrorMessage: vi.fn(() => 'Failed'),
}));

const renderReset = (search = '?token=abc&email=user@example.com') =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/reset-password${search}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('ResetPasswordPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('renders reset password form with email prefilled', () => {
    renderReset();
    expect(screen.getByRole('heading', { name: /đặt lại mật khẩu/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue('user@example.com');
  });

  it('renders new password fields', () => {
    renderReset();
    expect(screen.getByLabelText(/mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/xác nhận mật khẩu/i)).toBeInTheDocument();
  });
});
