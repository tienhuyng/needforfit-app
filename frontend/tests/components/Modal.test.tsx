import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '@/components/common/Modal';

describe('Modal', () => {
  it('renders title and children when open', () => {
    render(
      <Modal open title="Test Modal" onClose={vi.fn()}>
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Close me" onClose={onClose}>
        content
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} title="Hidden" onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
