import { beforeEach, describe, expect, it } from 'vitest';
import { useGamificationStore } from './gamification.store';

describe('gamification.store', () => {
  beforeEach(() => {
    useGamificationStore.getState().resetGamification();
  });

  it('initializes with default clean state', () => {
    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(0);
    expect(state.streak.currentStreak).toBe(0);
    expect(state.streak.longestStreak).toBe(0);
    expect(state.streak.lastActivityDate).toBeNull();
    expect(state.streak.isActiveToday).toBe(false);
    expect(state.unlockedAchievements).toEqual([]);
    expect(state.xpHistory).toEqual([]);
    expect(state.rewardedCollectionIds).toEqual([]);
  });

  describe('handleUserAction', () => {
    it('awards base XP, streak bonus and unlocks first_item achievement on first activity', () => {
      const result = useGamificationStore.getState().handleUserAction({
        action: 'add_item',
        description: 'Añadido "Dune" a Libros',
        today: '2026-11-20',
        now: '2026-11-20T10:00:00.000Z',
        collections: [{ id: 'col-1', statuses: [{ id: 'st-1', isCompleted: false }] }],
        items: [{ id: 'it-1', collectionId: 'col-1', statusId: 'st-1' }],
      });

      // Base XP (10) + Streak Bonus (15) + Achievement first_item (20) = 45 XP
      expect(result.baseXpGained).toBe(10);
      expect(result.streakBonusXp).toBe(15);
      expect(result.achievementBonusXp).toBe(20);
      expect(result.totalXpGained).toBe(45);
      expect(result.streakExtended).toBe(true);
      expect(result.currentStreak).toBe(1);
      expect(result.newlyUnlockedAchievements.map((a) => a.id)).toContain('first_item');
      expect(result.leveledUp).toBe(false);

      const state = useGamificationStore.getState();
      expect(state.totalXp).toBe(45);
      expect(state.streak.currentStreak).toBe(1);
      expect(state.streak.isActiveToday).toBe(true);
      expect(state.unlockedAchievements).toHaveLength(1);
      expect(state.unlockedAchievements[0].achievementId).toBe('first_item');
      expect(state.xpHistory).toHaveLength(3); // add_item, daily_streak, achievement
    });

    it('does not re-grant streak bonus or duplicate achievements on repeated action same day', () => {
      // Primera acción del día
      useGamificationStore.getState().handleUserAction({
        action: 'add_item',
        description: 'Ítem 1',
        today: '2026-11-20',
        now: '2026-11-20T10:00:00.000Z',
        collections: [],
        items: [{ id: 'it-1', collectionId: 'col-1', statusId: 'st-1' }],
      });

      // Segunda acción del mismo día
      const result2 = useGamificationStore.getState().handleUserAction({
        action: 'add_item',
        description: 'Ítem 2',
        today: '2026-11-20',
        now: '2026-11-20T11:00:00.000Z',
        collections: [],
        items: [
          { id: 'it-1', collectionId: 'col-1', statusId: 'st-1' },
          { id: 'it-2', collectionId: 'col-1', statusId: 'st-1' },
        ],
      });

      expect(result2.baseXpGained).toBe(10);
      expect(result2.streakBonusXp).toBe(0);
      expect(result2.streakExtended).toBe(false);
      expect(result2.currentStreak).toBe(1);
      // first_item ya estaba desbloqueado
      expect(result2.newlyUnlockedAchievements.map((a) => a.id)).not.toContain('first_item');

      const state = useGamificationStore.getState();
      // 45 previo + 10 = 55 XP
      expect(state.totalXp).toBe(55);
    });

    it('detects level up properly when crossing level threshold', () => {
      // Concedemos 90 XP
      useGamificationStore.getState().awardXp('add_item', 90, 'Setup', '2026-11-20T09:00:00.000Z');
      expect(useGamificationStore.getState().totalXp).toBe(90);

      // Ahora completamos un ítem (+50 XP base + 15 streak + 30 achievement = 95 XP)
      const result = useGamificationStore.getState().handleUserAction({
        action: 'complete_item',
        description: 'Ítem completado',
        today: '2026-11-20',
        now: '2026-11-20T10:00:00.000Z',
        collections: [],
        items: [{ id: 'it-1', collectionId: 'col-1', statusId: 'st-c', xpAwarded: true }],
      });

      expect(result.leveledUp).toBe(true);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.newLevelTitle).toBe('Aprendiz de Coleccionista');
    });

    it('awards 100% completed collection bonus (+100 XP) only once per collection (idempotency)', () => {
      const collectionId = 'col-completed';
      const items = [
        { id: '1', collectionId, statusId: 'c', xpAwarded: true },
        { id: '2', collectionId, statusId: 'c', xpAwarded: true },
        { id: '3', collectionId, statusId: 'c', xpAwarded: true },
      ];
      const collections = [{ id: collectionId, statuses: [{ id: 'c', isCompleted: true }] }];

      // Primera vez que se detecta completa
      const result1 = useGamificationStore.getState().handleUserAction({
        action: 'complete_item',
        description: 'Tercer ítem completado',
        today: '2026-11-20',
        now: '2026-11-20T12:00:00.000Z',
        collections,
        items,
      });

      expect(result1.collectionBonusXp).toBe(100);
      expect(result1.newlyUnlockedAchievements.map((a) => a.id)).toContain('collection_master');
      expect(useGamificationStore.getState().rewardedCollectionIds).toContain(collectionId);

      // Siguiente acción con la misma colección completada: no duplica el bono de 100 XP
      const result2 = useGamificationStore.getState().handleUserAction({
        action: 'rate_and_review',
        description: 'Reseña de ítem',
        today: '2026-11-20',
        now: '2026-11-20T13:00:00.000Z',
        collections,
        items,
      });

      expect(result2.collectionBonusXp).toBe(0);
      expect(result2.newlyUnlockedAchievements.map((a) => a.id)).not.toContain('collection_master');
    });
  });

  describe('syncAchievements', () => {
    it('retroactively evaluates achievements for pre-existing catalog data', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `it-${i}`,
        collectionId: 'col-1',
        statusId: 'st-1',
      }));

      const result = useGamificationStore.getState().syncAchievements({
        today: '2026-11-20',
        now: '2026-11-20T10:00:00.000Z',
        collections: [{ id: 'col-1', statuses: [{ id: 'st-1', isCompleted: false }] }],
        items,
      });

      // Debe desbloquear first_item y five_items
      expect(result.newlyUnlockedAchievements.map((a) => a.id)).toContain('first_item');
      expect(result.newlyUnlockedAchievements.map((a) => a.id)).toContain('five_items');
      expect(result.achievementBonusXp).toBe(20 + 40); // 60 XP
      expect(useGamificationStore.getState().totalXp).toBe(60);
    });

    it('does not re-award already unlocked achievements on second sync', () => {
      const items = [{ id: '1', collectionId: 'col-1', statusId: 'st-1' }];

      // Primer sync
      useGamificationStore.getState().syncAchievements({
        today: '2026-11-20',
        now: '2026-11-20T10:00:00.000Z',
        collections: [],
        items,
      });
      expect(useGamificationStore.getState().totalXp).toBe(20);

      // Segundo sync
      const result2 = useGamificationStore.getState().syncAchievements({
        today: '2026-11-20',
        now: '2026-11-20T11:00:00.000Z',
        collections: [],
        items,
      });
      expect(result2.newlyUnlockedAchievements).toEqual([]);
      expect(useGamificationStore.getState().totalXp).toBe(20);
    });
  });

  describe('awardXp', () => {
    it('adds points and appends event to history', () => {
      useGamificationStore.getState().awardXp('add_item', 50, 'Bono manual', '2026-11-20T10:00:00.000Z', 'it-1');
      const state = useGamificationStore.getState();
      expect(state.totalXp).toBe(50);
      expect(state.xpHistory).toHaveLength(1);
      expect(state.xpHistory[0].xpGained).toBe(50);
      expect(state.xpHistory[0].targetId).toBe('it-1');
    });

    it('ignores 0 or negative values', () => {
      useGamificationStore.getState().awardXp('add_item', 0, 'Cero', '2026-11-20T10:00:00.000Z');
      useGamificationStore.getState().awardXp('add_item', -20, 'Negativo', '2026-11-20T10:00:00.000Z');
      expect(useGamificationStore.getState().totalXp).toBe(0);
      expect(useGamificationStore.getState().xpHistory).toHaveLength(0);
    });
  });
});
