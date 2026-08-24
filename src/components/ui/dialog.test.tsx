import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

describe('Dialog portal', () => {
  it('renders outside its transformed or clipped trigger ancestor', () => {
    render(
      <div data-testid="trigger-ancestor" style={{ transform: 'translateZ(0)', overflow: 'hidden' }}>
        <Dialog isOpen onClose={vi.fn()} title="Choose scrape sources">
          <p>Source selection content</p>
        </Dialog>
      </div>,
    );

    const triggerAncestor = screen.getByTestId('trigger-ancestor');
    const dialogContent = screen.getByText('Source selection content');
    expect(triggerAncestor).not.toContainElement(dialogContent);
    expect(document.body).toContainElement(dialogContent);
  });
});
