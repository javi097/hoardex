import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementCard } from './AchievementCard';
import type { Achievement } from '@/interfaces/gamification.interface';

describe('AchievementCard', () => {
  const mockAchievement: Achievement = {
    id: 'first_item',
    title: 'Primer ejemplar',
    description: 'Añade tu primer ítem a cualquier colección.',
    icon: 'PackagePlus',
    category: 'catalog',
    tier: 'bronze',
    xpReward: 20,
    condition: () => true,
  };

  it('renders locked achievement with appropriate ARIA and visual indicators', () => {
    render(<AchievementCard achievement={mockAchievement} />);

    const article = screen.getByRole('article', {
      name: 'Logro bloqueado: Primer ejemplar',
    });
    expect(article).toBeDefined();

    expect(screen.getByText('Primer ejemplar')).toBeDefined();
    expect(
      screen.getByText('Añade tu primer ítem a cualquier colección.')
    ).toBeDefined();
    expect(screen.getByText('Bronce')).toBeDefined();
    expect(screen.getByText('+20 XP')).toBeDefined();
    expect(screen.getByText('Bloqueado')).toBeDefined();
  });

  it('renders unlocked achievement with unlock date and success indicator', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        unlockedInfo={{
          achievementId: 'first_item',
          unlockedAt: '2026-03-15T10:00:00.000Z',
        }}
      />
    );

    const article = screen.getByRole('article', {
      name: 'Logro desbloqueado: Primer ejemplar',
    });
    expect(article).toBeDefined();

    expect(screen.getByText(/Desbloqueado:/i)).toBeDefined();
    expect(screen.queryByText('Bloqueado')).toBeNull();
  });

  it('renders platinum tier achievement styling correctly', () => {
    const platinumAchievement: Achievement = {
      ...mockAchievement,
      id: 'legend',
      title: 'Maestro Legendario',
      tier: 'platinum',
      xpReward: 250,
    };

    render(<AchievementCard achievement={platinumAchievement} />);

    expect(screen.getByText('Platino')).toBeDefined();
    expect(screen.getByText('+250 XP')).toBeDefined();
  });
});
