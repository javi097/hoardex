import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No hay colecciones"
        description="Crea tu primera colección para empezar."
      />
    );

    expect(screen.getByText('No hay colecciones')).toBeDefined();
    expect(
      screen.getByText('Crea tu primera colección para empezar.')
    ).toBeDefined();
  });

  it('renders action element when provided', () => {
    render(
      <EmptyState
        title="Vacío"
        action={<button type="button">Nuevo ítem</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Nuevo ítem' })).toBeDefined();
  });
});
