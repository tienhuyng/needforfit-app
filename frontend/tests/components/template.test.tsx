import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/template/Button';
import { Input } from '@/components/template/Input';
import { Card } from '@/components/template/Card';

describe('Template Components', () => {
  it('Button renders with variant and loading state', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('Input shows error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('Card renders title and children', () => {
    render(
      <Card title="Test Card">
        <p>Content</p>
      </Card>
    );
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
