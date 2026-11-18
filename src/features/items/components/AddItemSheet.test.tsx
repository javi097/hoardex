import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddItemSheet } from './AddItemSheet';
import type { Collection } from '@/interfaces/collection.interface';
import * as providersModule from '@/providers';

describe('AddItemSheet', () => {
  const mockCollectionManual: Collection = {
    id: 'col-manual-1',
    name: 'Mis Figuras',
    description: 'Colección de figuras anime',
    icon: 'Sparkles',
    accentColor: '#ec4899',
    provider: 'manual',
    statuses: [
      { id: 'st-1', label: 'Deseado', isCompleted: false, order: 0 },
      { id: 'st-2', label: 'En vitrina', isCompleted: true, order: 1 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const mockCollectionRawg: Collection = {
    id: 'col-rawg-1',
    name: 'Mis Videojuegos',
    description: 'Juegos de PC y Switch',
    icon: 'Gamepad2',
    accentColor: '#6366f1',
    provider: 'rawg',
    statuses: [
      { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'st-2', label: 'Jugando', isCompleted: false, order: 1 },
      { id: 'st-3', label: 'Completado', isCompleted: true, order: 2 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('renders directly the manual form without search tab when provider is "manual"', () => {
    render(
      <AddItemSheet
        collection={mockCollectionManual}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // No debe mostrar la pestaña "Buscar en catálogo"
    expect(screen.queryByText('Buscar en catálogo')).toBeNull();

    // Debe mostrar el formulario manual directamente con el campo Título
    expect(screen.getByLabelText(/Título \*/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Añadir ítem/i })).toBeDefined();
  });

  it('renders search tab by default when provider is not manual', () => {
    render(
      <AddItemSheet
        collection={mockCollectionRawg}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Buscar en catálogo')).toBeDefined();
    expect(screen.getByText('Alta manual')).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar por título/i)).toBeDefined();
    expect(
      screen.getByText(/Busca videojuegos por título en la base de datos de RAWG/i)
    ).toBeDefined();
  });

  it('shows accessible error alert and allows switching to manual form with pre-filled title', async () => {
    const mockProvider = {
      search: vi.fn().mockRejectedValue(new Error('Falta configurar VITE_RAWG_API_KEY')),
    };
    vi.spyOn(providersModule, 'getSearchProvider').mockReturnValue(mockProvider);

    render(
      <AddItemSheet
        collection={mockCollectionRawg}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Buscar por título/i);
    fireEvent.change(input, { target: { value: 'Zelda Breath' } });

    // Disparar la búsqueda mediante el botón submit
    const submitBtn = screen.getByRole('button', { name: /^Buscar$/i });
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeDefined();
    expect(screen.getByText(/Falta configurar VITE_RAWG_API_KEY/i)).toBeDefined();

    // Clic en el botón del banner para pasar a alta manual
    const manualActionBtn = screen.getByRole('button', {
      name: /Dar de alta manualmente/i,
    });
    fireEvent.click(manualActionBtn);

    // Debe mostrar el formulario manual con el título pre-rellenado
    await waitFor(() => {
      const titleInput = screen.getByLabelText(/Título \*/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Zelda Breath');
    });
  });
});
