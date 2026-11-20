import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('renders 5 interactive buttons in normal mode with accessible labels', () => {
    render(<StarRating value={3} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);

    expect(screen.getByRole('button', { name: 'Calificar con 1 estrella' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Calificar con 2 estrellas' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Calificar con 3 estrellas' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Calificar con 4 estrellas' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Calificar con 5 estrellas' })).toBeDefined();
  });

  it('marks aria-pressed correctly based on value', () => {
    render(<StarRating value={3} />);

    const star3 = screen.getByRole('button', { name: 'Calificar con 3 estrellas' });
    const star2 = screen.getByRole('button', { name: 'Calificar con 2 estrellas' });
    const star4 = screen.getByRole('button', { name: 'Calificar con 4 estrellas' });

    expect(star3.getAttribute('aria-pressed')).toBe('true');
    expect(star2.getAttribute('aria-pressed')).toBe('false');
    expect(star4.getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with star number when clicked', () => {
    const handleChange = vi.fn();
    render(<StarRating value={2} onChange={handleChange} />);

    const star4 = screen.getByRole('button', { name: 'Calificar con 4 estrellas' });
    fireEvent.click(star4);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('calls onChange with undefined when clicking the already selected star (unselect)', () => {
    const handleChange = vi.fn();
    render(<StarRating value={3} onChange={handleChange} />);

    const star3 = screen.getByRole('button', { name: 'Calificar con 3 estrellas' });
    fireEvent.click(star3);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(undefined);
  });

  it('updates preview on mouse enter and resets on mouse leave', () => {
    render(<StarRating value={2} />);

    const star4 = screen.getByRole('button', { name: 'Calificar con 4 estrellas' });
    const group = screen.getByRole('group', { name: 'Valoración por estrellas' });

    // Hover over star 4
    fireEvent.mouseEnter(star4);
    // Mouse leave the container
    fireEvent.mouseLeave(group);
  });

  it('renders correctly in readonly mode without interactive buttons', () => {
    render(<StarRating value={4} readonly />);

    // No interactive buttons should be present
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    // Should expose role="img" with descriptive aria-label
    const img = screen.getByRole('img', { name: 'Valoración: 4 de 5 estrellas' });
    expect(img).toBeDefined();
  });

  it('renders "Sin valoración" in readonly mode when value is undefined', () => {
    render(<StarRating readonly />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const img = screen.getByRole('img', { name: 'Sin valoración' });
    expect(img).toBeDefined();
  });

  it('supports different sizes and custom className', () => {
    const { container: smContainer } = render(<StarRating size="sm" className="custom-sm" />);
    expect(smContainer.querySelector('.custom-sm')).toBeDefined();

    const { container: lgContainer } = render(<StarRating size="lg" className="custom-lg" />);
    expect(lgContainer.querySelector('.custom-lg')).toBeDefined();
  });
});
