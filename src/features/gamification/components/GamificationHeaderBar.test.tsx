import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { GamificationHeaderBar } from './GamificationHeaderBar';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';

describe('GamificationHeaderBar', () => {
  beforeEach(() => {
    useGamificationStore.getState().resetGamification();
  });

  it('renders level 1 and initial zero-progress indicators', () => {
    render(
      <MemoryRouter>
        <GamificationHeaderBar />
      </MemoryRouter>
    );

    // Debe mostrar Nivel 1 y título Iniciado
    expect(screen.getByText('Nv. 1')).toBeDefined();
    expect(screen.getByText('Iniciado')).toBeDefined();

    // Barra de progreso con ARIA accesible
    const progressBar = screen.getByRole('progressbar', {
      name: /Progreso al Nivel 2: 0%/i,
    });
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');

    // Racha inicial pendiente de 0 días
    expect(screen.getByLabelText(/Racha de 0 días pendiente hoy/i)).toBeDefined();
  });

  it('reflects updated XP and higher levels dynamically', () => {
    // Nivel 1: 100 XP, Nivel 2: 150 XP. Total 250 XP => Nivel 3 (0/200 XP)
    useGamificationStore.setState({
      totalXp: 250,
      streak: {
        currentStreak: 4,
        longestStreak: 5,
        lastActivityDate: new Date().toISOString().slice(0, 10),
        isActiveToday: true,
      },
      unlockedAchievements: [
        { achievementId: 'first_item', unlockedAt: '2026-03-01T00:00:00.000Z' },
        { achievementId: 'first_completed', unlockedAt: '2026-03-02T00:00:00.000Z' },
      ],
    });

    render(
      <MemoryRouter>
        <GamificationHeaderBar />
      </MemoryRouter>
    );

    expect(screen.getByText('Nv. 3')).toBeDefined();
    expect(screen.getByText('Catalogador Curioso')).toBeDefined();

    // Racha activa hoy (4 d)
    expect(screen.getByLabelText(/Racha de 4 días activa hoy/i)).toBeDefined();

    // Logros desbloqueados (2)
    expect(
      screen.getByLabelText(/Ver 2 de 12 logros conseguidos/i)
    ).toBeDefined();
  });

  it('shows pending streak status if last activity was not today', () => {
    useGamificationStore.setState({
      streak: {
        currentStreak: 2,
        longestStreak: 3,
        lastActivityDate: '2020-01-01',
        isActiveToday: false,
      },
    });

    render(
      <MemoryRouter>
        <GamificationHeaderBar />
      </MemoryRouter>
    );

    expect(
      screen.getByLabelText(/Racha de 2 días pendiente hoy/i)
    ).toBeDefined();
  });
});
