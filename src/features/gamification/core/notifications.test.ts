import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { notifyGamificationResult } from './notifications';
import type { ActionResult } from '../store/gamification.store';
import type { Achievement } from '@/interfaces/gamification.interface';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('notifyGamificationResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseResult: ActionResult = {
    totalXpGained: 10,
    baseXpGained: 10,
    streakBonusXp: 0,
    collectionBonusXp: 0,
    achievementBonusXp: 0,
    leveledUp: false,
    previousLevel: 1,
    newLevel: 1,
    newLevelTitle: 'Iniciado',
    newlyUnlockedAchievements: [],
    streakExtended: false,
    currentStreak: 1,
  };

  it('does not trigger notifications if no level up and no achievements', () => {
    notifyGamificationResult(baseResult);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('triggers level-up toast when leveledUp is true', () => {
    notifyGamificationResult({
      ...baseResult,
      leveledUp: true,
      newLevel: 2,
      newLevelTitle: 'Aprendiz de Coleccionista',
    });

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      '¡Subiste de nivel! Has alcanzado el Nivel 2: Aprendiz de Coleccionista'
    );
  });

  it('triggers achievement toast for each newly unlocked achievement', () => {
    const mockAchievement1: Achievement = {
      id: 'first_item',
      title: 'Primer ejemplar',
      description: 'Añade tu primer ítem',
      icon: 'PackagePlus',
      category: 'catalog',
      tier: 'bronze',
      xpReward: 20,
      condition: () => true,
    };

    const mockAchievement2: Achievement = {
      id: 'first_completed',
      title: 'Objetivo cumplido',
      description: 'Completa tu primer ítem',
      icon: 'CheckCircle2',
      category: 'completion',
      tier: 'bronze',
      xpReward: 30,
      condition: () => true,
    };

    notifyGamificationResult({
      ...baseResult,
      newlyUnlockedAchievements: [mockAchievement1, mockAchievement2],
    });

    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenNthCalledWith(
      1,
      '¡Logro desbloqueado! Primer ejemplar (+20 XP)'
    );
    expect(toast.success).toHaveBeenNthCalledWith(
      2,
      '¡Logro desbloqueado! Objetivo cumplido (+30 XP)'
    );
  });

  it('triggers both level-up and achievement toasts in sequence', () => {
    const mockAchievement: Achievement = {
      id: 'streak_3',
      title: 'Constancia inicial',
      description: 'Racha de 3 días',
      icon: 'Flame',
      category: 'streaks',
      tier: 'bronze',
      xpReward: 35,
      condition: () => true,
    };

    notifyGamificationResult({
      ...baseResult,
      leveledUp: true,
      newLevel: 3,
      newLevelTitle: 'Catalogador Curioso',
      newlyUnlockedAchievements: [mockAchievement],
    });

    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenNthCalledWith(
      1,
      '¡Subiste de nivel! Has alcanzado el Nivel 3: Catalogador Curioso'
    );
    expect(toast.success).toHaveBeenNthCalledWith(
      2,
      '¡Logro desbloqueado! Constancia inicial (+35 XP)'
    );
  });
});
