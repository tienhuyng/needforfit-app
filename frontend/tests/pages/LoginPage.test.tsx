import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { LoginPage } from '@/pages/auth/LoginPage';

vi.mock('@/services/auth.service', () => ({
  authApi: {
    login: vi.fn(),
  },
  getApiErrorMessage: vi.fn(() => 'Login failed'),
  storeAuthToken: vi.fn(),
}));

const renderLogin = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('LoginPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('renders login form with i18n labels', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /đăng nhập/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'password123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    expect(await screen.findByText(/định dạng email/i)).toBeInTheDocument();
  });

  it('has link to register and forgot password', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /đăng ký ngay/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.getByRole('link', { name: /quên mật khẩu/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });
});
