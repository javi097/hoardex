import { describe, expect, it } from 'vitest';
import type { PersistedGamificationData } from '@/interfaces/sync.interface';
import {
  reconcileEntitiesLWW,
  reconcileGamification,
  type TimestampedEntity,
} from './reconciliation';

describe('reconciliation', () => {
  describe('reconcileEntitiesLWW', () => {
    it('preserves elements that exist only in local or only in remote', () => {
      const local: TimestampedEntity[] = [
        { id: '1', createdAt: '2026-11-20T10:00:00.000Z' },
      ];
      const remote: TimestampedEntity[] = [
        { id: '2', createdAt: '2026-11-20T11:00:00.000Z' },
      ];

      const result = reconcileEntitiesLWW(local, remote);
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toContain('1');
      expect(result.map((e) => e.id)).toContain('2');
    });

    it('resolves collision by taking remote when remote updatedAt is newer', () => {
      const local = [
        {
          id: '1',
          name: 'Versión Local Vieja',
          updatedAt: '2026-11-20T10:00:00.000Z',
        },
      ];
      const remote = [
        {
          id: '1',
          name: 'Versión Remota Nueva',
          updatedAt: '2026-11-20T12:00:00.000Z',
        },
      ];

      const result = reconcileEntitiesLWW(local, remote);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Versión Remota Nueva');
    });

    it('resolves collision by taking local when local updatedAt is newer or equal', () => {
      const local = [
        {
          id: '1',
          name: 'Versión Local Nueva',
          updatedAt: '2026-11-20T14:00:00.000Z',
        },
      ];
      const remote = [
        {
          id: '1',
          name: 'Versión Remota Vieja',
          updatedAt: '2026-11-20T12:00:00.000Z',
        },
      ];

      const result = reconcileEntitiesLWW(local, remote);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Versión Local Nueva');
    });

    it('falls back to createdAt when updatedAt is not defined', () => {
      const local = [
        { id: '1', name: 'Local Antiguo', createdAt: '2026-11-18T10:00:00.000Z' },
      ];
      const remote = [
        { id: '1', name: 'Remoto Reciente', createdAt: '2026-11-19T10:00:00.000Z' },
      ];

      const result = reconcileEntitiesLWW(local, remote);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Remoto Reciente');
    });
  });

  describe('reconcileGamification', () => {
    const localState: PersistedGamificationData = {
      totalXp: 150,
      streak: {
        currentStreak: 2,
        longestStreak: 4,
        lastActivityDate: '2026-11-20',
        isActiveToday: false,
      },
      unlockedAchievements: [
        { achievementId: 'first_item', unlockedAt: '2026-11-19T10:00:00.000Z' },
        { achievementId: 'five_items', unlockedAt: '2026-11-20T12:00:00.000Z' },
      ],
      claimedChallengeIds: ['weekly_1'],
      rewardedCollectionIds: ['col-1'],
      xpHistory: [
        {
          id: 'ev-1',
          action: 'add_item',
          xpGained: 10,
          description: 'Local 1',
          timestamp: '2026-11-20T10:00:00.000Z',
        },
      ],
    };

    const remoteState: PersistedGamificationData = {
      totalXp: 200,
      streak: {
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: '2026-11-21',
        isActiveToday: true,
      },
      unlockedAchievements: [
        { achievementId: 'first_item', unlockedAt: '2026-11-18T10:00:00.000Z' }, // Más antiguo
        { achievementId: 'ten_items', unlockedAt: '2026-11-21T08:00:00.000Z' },
      ],
      claimedChallengeIds: ['weekly_2'],
      rewardedCollectionIds: ['col-2'],
      xpHistory: [
        {
          id: 'ev-2',
          action: 'complete_item',
          xpGained: 50,
          description: 'Remote 2',
          timestamp: '2026-11-21T08:00:00.000Z',
        },
      ],
    };

    it('takes the maximum of totalXp', () => {
      const merged = reconcileGamification(localState, remoteState);
      expect(merged.totalXp).toBe(200);
    });

    it('selects the streak with the most recent lastActivityDate', () => {
      const merged = reconcileGamification(localState, remoteState);
      expect(merged.streak.currentStreak).toBe(3);
      expect(merged.streak.longestStreak).toBe(5);
      expect(merged.streak.lastActivityDate).toBe('2026-11-21');
      expect(merged.streak.isActiveToday).toBe(true);
    });

    it('performs unique union of unlocked achievements keeping oldest unlockedAt', () => {
      const merged = reconcileGamification(localState, remoteState);
      expect(merged.unlockedAchievements).toHaveLength(3);

      const firstItem = merged.unlockedAchievements.find(
        (a) => a.achievementId === 'first_item'
      );
      expect(firstItem?.unlockedAt).toBe('2026-11-18T10:00:00.000Z');
    });

    it('unions claimed challenges and rewarded collection IDs idempotently', () => {
      const merged = reconcileGamification(localState, remoteState);
      expect(merged.claimedChallengeIds).toEqual(['weekly_1', 'weekly_2']);
      expect(merged.rewardedCollectionIds).toEqual(['col-1', 'col-2']);
    });

    it('combines and sorts xpHistory in descending order', () => {
      const merged = reconcileGamification(localState, remoteState);
      expect(merged.xpHistory).toHaveLength(2);
      expect(merged.xpHistory[0].id).toBe('ev-2'); // 21 nov > 20 nov
      expect(merged.xpHistory[1].id).toBe('ev-1');
    });

    it('caps xpHistory at 50 events', () => {
      const manyEvents = Array.from({ length: 40 }, (_, i) => ({
        id: `ev-local-${i}`,
        action: 'add_item' as const,
        xpGained: 10,
        description: `Item ${i}`,
        timestamp: `2026-11-20T10:${String(i).padStart(2, '0')}:00.000Z`,
      }));

      const manyRemoteEvents = Array.from({ length: 40 }, (_, i) => ({
        id: `ev-remote-${i}`,
        action: 'add_item' as const,
        xpGained: 10,
        description: `Remote item ${i}`,
        timestamp: `2026-11-21T10:${String(i).padStart(2, '0')}:00.000Z`,
      }));

      const merged = reconcileGamification(
        { ...localState, xpHistory: manyEvents },
        { ...remoteState, xpHistory: manyRemoteEvents }
      );

      expect(merged.xpHistory).toHaveLength(50);
      // Los primeros deben ser los más recientes (remotos de 21 nov)
      expect(merged.xpHistory[0].timestamp.startsWith('2026-11-21')).toBe(true);
    });
  });
});
