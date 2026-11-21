import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { AchievementsPage } from './AchievementsPage';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AchievementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGamificationStore.getState().resetGamification();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
  });

  it('renders collector profile summary and base achievements correctly', () => {
    useGamificationStore.setState({
      totalXp: 180,
      streak: {
        currentStreak: 3,
        longestStreak: 7,
        lastActivityDate: new Date().toISOString().slice(0, 10),
        isActiveToday: true,
      },
      unlockedAchievements: [
        {
          achievementId: 'first_item',
          unlockedAt: '2026-03-10T12:00:00.000Z',
        },
      ],
    });

    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    );

    // Resumen de perfil dentro de la sección correspondiente
    const summarySection = screen.getByLabelText(
      'Resumen de nivel y experiencia'
    );
    expect(within(summarySection).getByText('Nivel 2')).toBeDefined();
    expect(
      within(summarySection).getByText('Aprendiz de Coleccionista')
    ).toBeDefined();
    expect(within(summarySection).getByText('180')).toBeDefined(); // XP Total
    expect(within(summarySection).getByText(/3 d/)).toBeDefined(); // Racha
    expect(within(summarySection).getByText(/Récord: 7 d/)).toBeDefined();

    // Contador de logros desbloqueados
    expect(screen.getByText(/1 de 12 conseguidos/i)).toBeDefined();

    // Enlace de retorno
    expect(screen.getByText('Volver a colecciones')).toBeDefined();
  });

  it('filters achievements by category when clicking category pills', () => {
    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    );

    // Inicialmente se muestran todos (12 logros)
    const allArticles = screen.getAllByRole('article');
    expect(allArticles.length).toBe(12);

    // Filtrar por 'Reseñas'
    const reviewsFilter = screen.getByRole('button', { name: /Reseñas/i });
    fireEvent.click(reviewsFilter);

    // En categoría reviews hay 'first_review' y 'five_reviews' (2 logros)
    const filteredArticles = screen.getAllByRole('article');
    expect(filteredArticles.length).toBe(2);
    expect(screen.getByText('Crítica constructiva')).toBeDefined();
    expect(screen.getByText('Voz autorizada')).toBeDefined();

    // Volver a 'Todos'
    const allFilter = screen.getByRole('button', { name: /Todos/i });
    fireEvent.click(allFilter);
    expect(screen.getAllByRole('article').length).toBe(12);
  });

  it('switches to Retos tab, shows badge for unclaimed challenges, and claiming updates state', () => {
    // 2 colecciones cumplen el reto de hito 'milestone_collections' (Cimientos firmes: 2 colecciones, +30 XP)
    useCollectionsStore.setState({
      collections: [
        {
          id: 'c1',
          name: 'Libros',
          accentColor: '#3b82f6',
          icon: 'Book',
          provider: 'manual',
          statuses: [{ id: 's1', label: 'Pendiente', isCompleted: false, order: 0 }],
          createdAt: '2026-11-20T10:00:00.000Z',
        },
        {
          id: 'c2',
          name: 'Videojuegos',
          accentColor: '#ef4444',
          icon: 'Gamepad2',
          provider: 'manual',
          statuses: [{ id: 's2', label: 'Pendiente', isCompleted: false, order: 0 }],
          createdAt: '2026-11-20T10:00:00.000Z',
        },
      ],
    });

    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    );

    // Cambiar a la pestaña "Retos"
    const challengesTab = screen.getByRole('tab', { name: /Retos/i });
    expect(challengesTab.getAttribute('aria-selected')).toBe('false');

    // Debe mostrar el badge con "1" pendiente
    expect(screen.getByLabelText(/1 recompensas pendientes de reclamar/i)).toBeDefined();

    fireEvent.click(challengesTab);
    expect(challengesTab.getAttribute('aria-selected')).toBe('true');

    // Comprobar panel de retos activo
    expect(screen.getByText('Retos y Desafíos')).toBeDefined();
    expect(screen.getByText('Cimientos firmes')).toBeDefined();

    // Botón de reclamar activo
    const claimButton = screen.getByRole('button', { name: /Reclamar \(\+30 XP\)/i });
    fireEvent.click(claimButton);

    // Toast emitido
    expect(toast.success).toHaveBeenCalledWith(
      '¡Reto completado! Cimientos firmes (+30 XP)'
    );

    // Estado en el store actualizado a 30 XP
    expect(useGamificationStore.getState().totalXp).toBe(30);
    expect(useGamificationStore.getState().claimedChallengeIds).toContain(
      'milestone_collections'
    );
  });

  it('switches to Estadísticas tab and displays CollectorStatsPanel', () => {
    useCollectionsStore.setState({
      collections: [
        {
          id: 'c1',
          name: 'Cómics',
          accentColor: '#3b82f6',
          icon: 'Book',
          provider: 'manual',
          statuses: [{ id: 's1', label: 'Terminado', isCompleted: true, order: 0 }],
          createdAt: '2026-11-20T10:00:00.000Z',
        },
      ],
    });

    useItemsStore.setState({
      items: [
        {
          id: 'it-1',
          collectionId: 'c1',
          statusId: 's1',
          xpAwarded: true,
          rating: 5,
          notes: 'Obra maestra',
          title: 'Watchmen',
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
          meta: {},
        },
      ],
    });

    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    );

    const statsTab = screen.getByRole('tab', { name: /Estadísticas/i });
    fireEvent.click(statsTab);

    expect(statsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Analíticas del Coleccionista')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined(); // Tasa de completado
    expect(screen.getByText('5.0')).toBeDefined(); // Valoración media
    expect(screen.getByText('Cómics')).toBeDefined(); // Colección activa
  });

  it('switches to Historial tab and displays XpHistoryFeed', () => {
    useGamificationStore.setState({
      xpHistory: [
        {
          id: 'ev-test',
          action: 'add_item',
          xpGained: 10,
          description: 'Añadido "Dune"',
          timestamp: '2026-11-20T10:00:00.000Z',
        },
      ],
    });

    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    );

    const historyTab = screen.getByRole('tab', { name: /Historial/i });
    fireEvent.click(historyTab);

    expect(historyTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Historial de Experiencia')).toBeDefined();
    expect(screen.getByText('Añadido "Dune"')).toBeDefined();
    expect(screen.getByText('+10 XP')).toBeDefined();
  });

  it('supports keyboard arrow navigation between tabs', () => {
    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    );

    const achievementsTab = screen.getByRole('tab', { name: /Logros/i });
    const challengesTab = screen.getByRole('tab', { name: /Retos/i });

    expect(achievementsTab.getAttribute('aria-selected')).toBe('true');

    // ArrowRight moving from Logros -> Retos
    fireEvent.keyDown(achievementsTab, { key: 'ArrowRight' });
    expect(challengesTab.getAttribute('aria-selected')).toBe('true');

    // ArrowLeft moving from Retos -> Logros
    fireEvent.keyDown(challengesTab, { key: 'ArrowLeft' });
    expect(achievementsTab.getAttribute('aria-selected')).toBe('true');
  });
});
