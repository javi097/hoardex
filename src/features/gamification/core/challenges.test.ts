import { describe, expect, it } from 'vitest';
import {
  getWeekBoundaries,
  CHALLENGES,
  calculateChallengeProgress,
  evaluateAllChallenges,
} from './challenges';
import type { ChallengeEvaluationState } from '@/interfaces/gamification.interface';

describe('challenges core', () => {
  describe('getWeekBoundaries', () => {
    it('calculates monday to sunday boundaries correctly for a midweek date', () => {
      // 2026-11-21 es sábado
      const boundaries = getWeekBoundaries('2026-11-21');
      expect(boundaries.startOfWeek).toBe('2026-11-16'); // Lunes
      expect(boundaries.endOfWeek).toBe('2026-11-22'); // Domingo
      expect(boundaries.weekKey).toBe('2026-W47');
    });

    it('handles monday as the start of the week', () => {
      // 2026-11-16 es lunes
      const boundaries = getWeekBoundaries('2026-11-16');
      expect(boundaries.startOfWeek).toBe('2026-11-16');
      expect(boundaries.endOfWeek).toBe('2026-11-22');
      expect(boundaries.weekKey).toBe('2026-W47');
    });

    it('handles sunday as the end of the week', () => {
      // 2026-11-22 es domingo
      const boundaries = getWeekBoundaries('2026-11-22');
      expect(boundaries.startOfWeek).toBe('2026-11-16');
      expect(boundaries.endOfWeek).toBe('2026-11-22');
      expect(boundaries.weekKey).toBe('2026-W47');
    });

    it('correctly computes boundaries across month boundary', () => {
      // 2026-03-31 es martes
      const boundaries = getWeekBoundaries('2026-03-31');
      expect(boundaries.startOfWeek).toBe('2026-03-30'); // Marzo
      expect(boundaries.endOfWeek).toBe('2026-04-05'); // Abril
      expect(boundaries.weekKey).toBe('2026-W14');
    });

    it('correctly handles ISO week around year transitions', () => {
      // 2026-12-31 es jueves -> Pertenece a 2026-W53
      const boundaries1 = getWeekBoundaries('2026-12-31');
      expect(boundaries1.startOfWeek).toBe('2026-12-28');
      expect(boundaries1.endOfWeek).toBe('2027-01-03');
      expect(boundaries1.weekKey).toBe('2026-W53');

      // 2027-01-01 es viernes -> Comparte semana con el jueves 31 dic
      const boundaries2 = getWeekBoundaries('2027-01-01');
      expect(boundaries2.startOfWeek).toBe('2026-12-28');
      expect(boundaries2.endOfWeek).toBe('2027-01-03');
      expect(boundaries2.weekKey).toBe('2026-W53');

      // 2027-01-04 es lunes -> Inicio de 2027-W01
      const boundaries3 = getWeekBoundaries('2027-01-04');
      expect(boundaries3.startOfWeek).toBe('2027-01-04');
      expect(boundaries3.endOfWeek).toBe('2027-01-10');
      expect(boundaries3.weekKey).toBe('2027-W01');
    });
  });

  describe('calculateChallengeProgress', () => {
    const today = '2026-11-21';
    const boundaries = getWeekBoundaries(today); // 2026-11-16 a 2026-11-22 (2026-W47)

    const baseState: ChallengeEvaluationState = {
      collections: [],
      items: [],
      xpHistory: [],
      totalXp: 0,
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        isActiveToday: false,
      },
      claimedChallengeIds: [],
    };

    it('evaluates weekly_add_items strictly within the week boundaries', () => {
      const challenge = CHALLENGES.find((c) => c.id === 'weekly_add_items')!;

      // 1 ítem de la semana anterior (2026-11-10), 2 de esta semana (2026-11-17, 2026-11-20), 1 de la siguiente (2026-11-25)
      const state: ChallengeEvaluationState = {
        ...baseState,
        items: [
          {
            id: 'it-prev',
            collectionId: 'c1',
            statusId: 's1',
            createdAt: '2026-11-10T10:00:00.000Z',
            updatedAt: '2026-11-10T10:00:00.000Z',
            meta: {},
          },
          {
            id: 'it-now1',
            collectionId: 'c1',
            statusId: 's1',
            createdAt: '2026-11-17T12:00:00.000Z',
            updatedAt: '2026-11-17T12:00:00.000Z',
            meta: {},
          },
          {
            id: 'it-now2',
            collectionId: 'c1',
            statusId: 's1',
            createdAt: '2026-11-20T08:00:00.000Z',
            updatedAt: '2026-11-20T08:00:00.000Z',
            meta: {},
          },
          {
            id: 'it-next',
            collectionId: 'c1',
            statusId: 's1',
            createdAt: '2026-11-25T14:00:00.000Z',
            updatedAt: '2026-11-25T14:00:00.000Z',
            meta: {},
          },
        ],
      };

      const result = calculateChallengeProgress(
        challenge,
        state,
        today,
        boundaries
      );
      expect(result.current).toBe(2);
      expect(result.target).toBe(2);
      expect(result.percentage).toBe(100);
      expect(result.isCompleted).toBe(true);
      expect(result.uniqueKey).toBe('weekly_add_items_2026-W47');
      expect(result.isClaimed).toBe(false);
    });

    it('clamps current progress to target and does not exceed 100%', () => {
      const challenge = CHALLENGES.find((c) => c.id === 'weekly_add_items')!;
      // 5 ítems creados esta semana (target = 2)
      const items = Array.from({ length: 5 }, (_, idx) => ({
        id: `it-${idx}`,
        collectionId: 'c1',
        statusId: 's1',
        createdAt: '2026-11-18T10:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
        meta: {},
      }));

      const state: ChallengeEvaluationState = { ...baseState, items };
      const result = calculateChallengeProgress(
        challenge,
        state,
        today,
        boundaries
      );

      expect(result.current).toBe(2); // Clamp al target
      expect(result.percentage).toBe(100);
      expect(result.isCompleted).toBe(true);
    });

    it('evaluates weekly_complete_items using xpHistory events', () => {
      const challenge = CHALLENGES.find(
        (c) => c.id === 'weekly_complete_items'
      )!;

      const state: ChallengeEvaluationState = {
        ...baseState,
        xpHistory: [
          {
            id: 'ev-1',
            action: 'complete_item',
            xpGained: 50,
            description: 'Completado',
            timestamp: '2026-11-19T10:00:00.000Z',
          },
        ],
      };

      const result = calculateChallengeProgress(
        challenge,
        state,
        today,
        boundaries
      );
      expect(result.current).toBe(1);
      expect(result.target).toBe(1);
      expect(result.isCompleted).toBe(true);
    });

    it('evaluates milestone_collections and respects fixed uniqueKey', () => {
      const challenge = CHALLENGES.find(
        (c) => c.id === 'milestone_collections'
      )!;

      const state: ChallengeEvaluationState = {
        ...baseState,
        collections: [
          { id: 'c1', name: 'Col 1', statuses: [] },
          { id: 'c2', name: 'Col 2', statuses: [] },
        ],
      };

      const result = calculateChallengeProgress(
        challenge,
        state,
        today,
        boundaries
      );
      expect(result.current).toBe(2);
      expect(result.target).toBe(2);
      expect(result.uniqueKey).toBe('milestone_collections');
      expect(result.isCompleted).toBe(true);
    });

    it('correctly marks isClaimed when uniqueKey is present in claimedChallengeIds', () => {
      const challenge = CHALLENGES.find((c) => c.id === 'weekly_add_items')!;
      const state: ChallengeEvaluationState = {
        ...baseState,
        claimedChallengeIds: ['weekly_add_items_2026-W47'],
      };

      const result = calculateChallengeProgress(
        challenge,
        state,
        today,
        boundaries
      );
      expect(result.isClaimed).toBe(true);
    });
  });

  describe('evaluateAllChallenges', () => {
    it('evaluates all 6 challenges in the catalog', () => {
      const state: ChallengeEvaluationState = {
        collections: [{ id: 'c1', name: 'Col 1', statuses: [] }],
        items: [],
        xpHistory: [],
        totalXp: 100,
        streak: {
          currentStreak: 2,
          longestStreak: 4,
          lastActivityDate: '2026-11-21',
          isActiveToday: true,
        },
        claimedChallengeIds: [],
      };

      const results = evaluateAllChallenges(CHALLENGES, state, '2026-11-21');
      expect(results).toHaveLength(6);

      const milestoneStreak = results.find(
        (r) => r.challengeId === 'milestone_streak'
      );
      expect(milestoneStreak).toBeDefined();
      expect(milestoneStreak?.current).toBe(3); // target = 3, longestStreak = 4 -> clamp 3
      expect(milestoneStreak?.isCompleted).toBe(true);
    });
  });
});
