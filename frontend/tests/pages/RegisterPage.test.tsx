import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/config/i18n';
import { RegisterPage } from '@/pages/auth/RegisterPage';

vi.mock('@/services/auth.service', () => ({
  authApi: {
    register: vi.fn(),
  },
  getApiErrorMessage: vi.fn(() => 'Register failed'),
  storeAuthToken: vi.fn(),
}));

const renderRegister = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('RegisterPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('renders registration form fields', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /đăng ký/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^tên$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^họ$/i)).toBeInTheDocument();
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/^tên$/i), 'Test');
    await user.type(screen.getByLabelText(/^họ$/i), 'User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'short');
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));

    expect(await screen.findByText(/ít nhất 8/i)).toBeInTheDocument();
  });
});
