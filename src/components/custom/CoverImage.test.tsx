import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoverImage } from './CoverImage';

describe('CoverImage', () => {
  it('renders placeholder immediately when src is undefined', () => {
    render(<CoverImage alt="Sin carátula" />);
    expect(screen.getByTestId('cover-placeholder')).toBeDefined();
    expect(screen.getByText('Sin imagen')).toBeDefined();
  });

  it('renders image and handles error event falling back to placeholder', () => {
    render(<CoverImage src="https://invalid-url.com/broken.jpg" alt="Portada de prueba" />);

    const img = screen.getByRole('img');
    expect(img).toBeDefined();

    // Simular error de carga
    fireEvent.error(img);

    expect(screen.getByTestId('cover-placeholder')).toBeDefined();
  });

  it('renders image and handles load event successfully', () => {
    render(<CoverImage src="https://example.com/cover.jpg" alt="Portada válida" />);

    const img = screen.getByRole('img');
    fireEvent.load(img);

    expect(img.className).toContain('opacity-100');
    expect(screen.queryByTestId('cover-placeholder')).toBeNull();
  });
});
