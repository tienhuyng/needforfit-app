import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

vi.mock('@/services/auth.service', () => ({
  authApi: {
    forgotPassword: vi.fn(),
  },
  getApiErrorMessage: vi.fn(() => 'Failed'),
}));

const renderForgot = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('ForgotPasswordPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders forgot password form in English', () => {
    renderForgot();
    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});
