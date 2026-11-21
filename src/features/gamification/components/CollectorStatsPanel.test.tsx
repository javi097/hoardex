import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectorStatsPanel } from './CollectorStatsPanel';
import type { CollectorStats } from '@/interfaces/gamification.interface';

describe('CollectorStatsPanel', () => {
  const mockFullStats: CollectorStats = {
    totalItems: 10,
    completedItems: 4,
    completionRate: 40,
    ratedItemsCount: 5,
    averageRating: 4.2,
    reviewedItemsCount: 3,
    totalCollections: 2,
    mostActiveCollection: {
      name: 'Videojuegos retro',
      itemCount: 7,
      completedCount: 3,
    },
  };

  const mockEmptyStats: CollectorStats = {
    totalItems: 0,
    completedItems: 0,
    completionRate: 0,
    ratedItemsCount: 0,
    averageRating: 0,
    reviewedItemsCount: 0,
    totalCollections: 0,
    mostActiveCollection: null,
  };

  it('renders all 4 metrics cards correctly when populated', () => {
    render(<CollectorStatsPanel stats={mockFullStats} />);

    // 1. Completado
    expect(screen.getByText('40%')).toBeDefined();
    expect(screen.getByText(/4 de 10 ítems completados/i)).toBeDefined();
    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('40');

    // 2. Nota media
    expect(screen.getByText('4.2')).toBeDefined();
    expect(screen.getByText(/5 ítems valorados/i)).toBeDefined();

    // 3. Colección activa
    expect(screen.getByText('Videojuegos retro')).toBeDefined();
    expect(screen.getByText(/7 ítems catalogados/i)).toBeDefined();
    expect(screen.getByText(/3 completados/i)).toBeDefined();

    // 4. Reseñas
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText(/reseñas redactadas/i)).toBeDefined();
    expect(screen.getByText(/En 2 colecciones/i)).toBeDefined();
  });

  it('renders fallback labels gracefully when empty (CL-01 & CL-06)', () => {
    render(<CollectorStatsPanel stats={mockEmptyStats} />);

    expect(screen.getByText('0%')).toBeDefined();
    expect(screen.getByText(/0 de 0 ítems completados/i)).toBeDefined();
    expect(screen.getByText('Sin valoraciones aún')).toBeDefined();
    expect(screen.getByText('Sin colecciones')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });
});
