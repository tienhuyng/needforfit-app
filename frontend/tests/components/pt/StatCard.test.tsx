import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, beforeEach } from 'vitest';
import { Users } from 'lucide-react';
import i18n from '@/config/i18n';
import { StatCard } from '@/components/pt/StatCard';

const renderStatCard = (title: string, value: string | number) =>
  render(
    <I18nextProvider i18n={i18n}>
      <StatCard title={title} value={value} icon={Users} />
    </I18nextProvider>
  );

describe('StatCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders title and value', () => {
    renderStatCard('Active Trainees', 42);
    expect(screen.getByText('Active Trainees')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders optional description', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <StatCard title="Programs" value={3} icon={Users} description="Total programs" />
      </I18nextProvider>
    );
    expect(screen.getByText('Total programs')).toBeInTheDocument();
  });
});
