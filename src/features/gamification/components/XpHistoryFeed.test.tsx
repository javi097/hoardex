import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { XpHistoryFeed } from './XpHistoryFeed';
import type { XpEvent } from '@/interfaces/gamification.interface';

describe('XpHistoryFeed', () => {
  const mockEvents: XpEvent[] = [
    {
      id: 'ev-1',
      action: 'add_item',
      xpGained: 10,
      description: 'Añadido "Dune" a Libros',
      timestamp: '2026-11-20T10:00:00.000Z',
    },
    {
      id: 'ev-2',
      action: 'daily_streak',
      xpGained: 15,
      description: 'Bono de racha diaria mantenida',
      timestamp: '2026-11-20T10:00:01.000Z',
    },
    {
      id: 'ev-3',
      action: 'challenge',
      xpGained: 30,
      description: 'Reto completado: Catalogador semanal',
      timestamp: '2026-11-20T11:00:00.000Z',
    },
    {
      id: 'ev-4',
      action: 'complete_item',
      xpGained: 50,
      description: 'Completado "Dune"',
      timestamp: '2026-11-20T12:00:00.000Z',
    },
    {
      id: 'ev-5',
      action: 'rate_and_review',
      xpGained: 15,
      description: 'Reseña y valoración añadidas',
      timestamp: '2026-11-20T12:30:00.000Z',
    },
    {
      id: 'ev-6',
      action: 'achievement',
      xpGained: 20,
      description: 'Logro desbloqueado: Primer ejemplar',
      timestamp: '2026-11-20T13:00:00.000Z',
    },
    {
      id: 'ev-7',
      action: 'create_collection',
      xpGained: 0,
      description: 'Colección "Comics" creada',
      timestamp: '2026-11-20T14:00:00.000Z',
    },
  ];

  it('renders empty state when there are no events', () => {
    render(<XpHistoryFeed events={[]} />);
    expect(screen.getByText('Sin actividad reciente')).toBeDefined();
    expect(
      screen.getByText(/El historial registrará tu experiencia ganada/i)
    ).toBeDefined();
  });

  it('renders up to 5 events initially and displays toggle button when length > 5', () => {
    render(<XpHistoryFeed events={mockEvents} />);

    expect(screen.getByRole('feed')).toBeDefined();
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(5);

    expect(screen.getByText('Añadido "Dune" a Libros')).toBeDefined();
    expect(screen.getByText('+10 XP')).toBeDefined();
    expect(screen.getByText('Reto completado: Catalogador semanal')).toBeDefined();
    expect(screen.getByText('+30 XP')).toBeDefined();

    const toggleButton = screen.getByRole('button', { name: /Ver más actividad/i });
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');

    // Expandir
    fireEvent.click(toggleButton);
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
    const expandedArticles = screen.getAllByRole('article');
    expect(expandedArticles).toHaveLength(7);
    expect(screen.getByText('Logro desbloqueado: Primer ejemplar')).toBeDefined();

    // Contraer
    fireEvent.click(toggleButton);
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });
});
