import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { DeleteButton } from './DeleteButton';

// Mock lucide-react Trash2 icon since we just want to verify it receives the correct props
vi.mock('lucide-react', () => ({
  Trash2: ({ size, strokeWidth, 'data-testid': dataTestId }: any) => (
    <svg data-testid={dataTestId || 'trash2-icon'} data-size={size} data-strokewidth={strokeWidth} />
  ),
}));

describe('DeleteButton', () => {
  it('renders correctly with default props', () => {
    render(<DeleteButton aria-label="delete-button" />);

    const button = screen.getByLabelText('delete-button');
    expect(button).toBeInTheDocument();

    // Check default class names
    expect(button).toHaveClass(
      'p-2', 'rounded-xl', 'text-slate-400', 'bg-slate-50',
      'hover:bg-red-50', 'hover:text-red-500', 'border',
      'border-transparent', 'hover:border-red-100',
      'transition-all', 'duration-200', 'shadow-sm',
      'hover:shadow', 'active:scale-95', 'flex',
      'items-center', 'justify-center'
    );

    // Check default size passed to icon
    const icon = screen.getByTestId('trash2-icon');
    expect(icon).toHaveAttribute('data-size', '18');
  });

  it('applies custom size to the icon', () => {
    render(<DeleteButton aria-label="delete-button" size={24} />);

    const icon = screen.getByTestId('trash2-icon');
    expect(icon).toHaveAttribute('data-size', '24');
  });

  it('merges custom className with default classes', () => {
    render(<DeleteButton aria-label="delete-button" className="custom-class mb-4" />);

    const button = screen.getByLabelText('delete-button');
    expect(button).toHaveClass('custom-class', 'mb-4');
    // Ensure default classes are still present
    expect(button).toHaveClass('p-2', 'rounded-xl');
  });

  it('handles standard button props like onClick and disabled', () => {
    const handleClick = vi.fn();
    render(<DeleteButton aria-label="delete-button" onClick={handleClick} disabled={true} />);

    const button = screen.getByLabelText('delete-button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    // Button is disabled, so click should not fire (browser standard behavior)
    // Actually, fireEvent.click on a disabled button doesn't trigger onClick in React Testing Library
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('calls onClick handler when clicked and not disabled', () => {
    const handleClick = vi.fn();
    render(<DeleteButton aria-label="delete-button" onClick={handleClick} />);

    const button = screen.getByLabelText('delete-button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
