import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AchievementsPage } from './AchievementsPage';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';

describe('AchievementsPage', () => {
  beforeEach(() => {
    useGamificationStore.getState().resetGamification();
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
});
