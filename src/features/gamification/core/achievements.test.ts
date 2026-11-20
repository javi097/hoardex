import { describe, expect, it } from 'vitest';
import type { GamificationEvaluationState } from '@/interfaces/gamification.interface';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements';

describe('achievements core logic', () => {
  it('defines the 12 base achievements with valid tiers and rewards', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);

    for (const ach of ACHIEVEMENTS) {
      expect(ach.id).toBeTruthy();
      expect(ach.title).toBeTruthy();
      expect(ach.description).toBeTruthy();
      expect(ach.icon).toBeTruthy();
      expect(['bronze', 'silver', 'gold', 'platinum']).toContain(ach.tier);
      expect(ach.xpReward).toBeGreaterThan(0);
      expect(typeof ach.condition).toBe('function');
    }
  });

  describe('evaluateAchievements', () => {
    const baseState: GamificationEvaluationState = {
      collections: [],
      items: [],
      totalXp: 0,
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        isActiveToday: false,
      },
      alreadyUnlockedIds: new Set<string>(),
    };

    it('returns empty array when no conditions are met', () => {
      const unlocked = evaluateAchievements(baseState);
      expect(unlocked).toEqual([]);
    });

    it('unlocks first_item when at least one item exists', () => {
      const state: GamificationEvaluationState = {
        ...baseState,
        items: [
          {
            id: 'it-1',
            collectionId: 'col-1',
            statusId: 'st-1',
          },
        ],
      };

      const unlocked = evaluateAchievements(state);
      expect(unlocked.map((a) => a.id)).toContain('first_item');
    });

    it('does not return achievements that are already unlocked (idempotency)', () => {
      const state: GamificationEvaluationState = {
        ...baseState,
        items: [
          {
            id: 'it-1',
            collectionId: 'col-1',
            statusId: 'st-1',
          },
        ],
        alreadyUnlockedIds: new Set<string>(['first_item']),
      };

      const unlocked = evaluateAchievements(state);
      expect(unlocked.map((a) => a.id)).not.toContain('first_item');
    });

    it('unlocks first_completed when an item has xpAwarded: true', () => {
      const state: GamificationEvaluationState = {
        ...baseState,
        items: [
          {
            id: 'it-1',
            collectionId: 'col-1',
            statusId: 'st-completed',
            xpAwarded: true,
          },
        ],
      };

      const unlocked = evaluateAchievements(state);
      expect(unlocked.map((a) => a.id)).toContain('first_item');
      expect(unlocked.map((a) => a.id)).toContain('first_completed');
    });

    it('unlocks first_review and five_reviews appropriately', () => {
      const stateWithOneReview: GamificationEvaluationState = {
        ...baseState,
        items: [
          {
            id: 'it-1',
            collectionId: 'col-1',
            statusId: 'st-1',
            rating: 5,
          },
        ],
      };
      const resultOne = evaluateAchievements(stateWithOneReview);
      expect(resultOne.map((a) => a.id)).toContain('first_review');
      expect(resultOne.map((a) => a.id)).not.toContain('five_reviews');

      const stateWithFiveReviews: GamificationEvaluationState = {
        ...baseState,
        items: Array.from({ length: 5 }, (_, i) => ({
          id: `it-${i}`,
          collectionId: 'col-1',
          statusId: 'st-1',
          notes: `Nota ${i}`,
        })),
      };
      const resultFive = evaluateAchievements(stateWithFiveReviews);
      expect(resultFive.map((a) => a.id)).toContain('first_review');
      expect(resultFive.map((a) => a.id)).toContain('five_reviews');
    });

    it('unlocks multi_collector when items span at least 3 distinct collections', () => {
      const stateTwoCollections: GamificationEvaluationState = {
        ...baseState,
        items: [
          { id: '1', collectionId: 'c1', statusId: 's1' },
          { id: '2', collectionId: 'c2', statusId: 's1' },
        ],
      };
      expect(evaluateAchievements(stateTwoCollections).map((a) => a.id)).not.toContain(
        'multi_collector'
      );

      const stateThreeCollections: GamificationEvaluationState = {
        ...baseState,
        items: [
          { id: '1', collectionId: 'c1', statusId: 's1' },
          { id: '2', collectionId: 'c2', statusId: 's1' },
          { id: '3', collectionId: 'c3', statusId: 's1' },
        ],
      };
      expect(evaluateAchievements(stateThreeCollections).map((a) => a.id)).toContain(
        'multi_collector'
      );
    });

    describe('collection_master condition', () => {
      it('does not unlock if collection has fewer than 3 items even if 100% completed', () => {
        const state: GamificationEvaluationState = {
          ...baseState,
          collections: [{ id: 'col-1', statuses: [{ id: 'st-comp', isCompleted: true }] }],
          items: [
            { id: '1', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
            { id: '2', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
          ],
        };

        expect(evaluateAchievements(state).map((a) => a.id)).not.toContain('collection_master');
      });

      it('does not unlock if collection has 3 items but not all completed', () => {
        const state: GamificationEvaluationState = {
          ...baseState,
          collections: [{ id: 'col-1', statuses: [{ id: 'st-comp', isCompleted: true }] }],
          items: [
            { id: '1', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
            { id: '2', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
            { id: '3', collectionId: 'col-1', statusId: 'st-pend', xpAwarded: false },
          ],
        };

        expect(evaluateAchievements(state).map((a) => a.id)).not.toContain('collection_master');
      });

      it('unlocks collection_master when a collection has >= 3 items and all are completed', () => {
        const state: GamificationEvaluationState = {
          ...baseState,
          collections: [{ id: 'col-1', statuses: [{ id: 'st-comp', isCompleted: true }] }],
          items: [
            { id: '1', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
            { id: '2', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
            { id: '3', collectionId: 'col-1', statusId: 'st-comp', xpAwarded: true },
          ],
        };

        expect(evaluateAchievements(state).map((a) => a.id)).toContain('collection_master');
      });
    });

    it('unlocks streak achievements when currentStreak matches or exceeds criteria', () => {
      const stateStreak3: GamificationEvaluationState = {
        ...baseState,
        streak: { ...baseState.streak, currentStreak: 3 },
      };
      const result3 = evaluateAchievements(stateStreak3);
      expect(result3.map((a) => a.id)).toContain('streak_3');
      expect(result3.map((a) => a.id)).not.toContain('streak_7');

      const stateStreak7: GamificationEvaluationState = {
        ...baseState,
        streak: { ...baseState.streak, currentStreak: 7 },
      };
      const result7 = evaluateAchievements(stateStreak7);
      expect(result7.map((a) => a.id)).toContain('streak_3');
      expect(result7.map((a) => a.id)).toContain('streak_7');
    });

    it('unlocks level_5 when totalXp >= 700', () => {
      const state690: GamificationEvaluationState = {
        ...baseState,
        totalXp: 690,
      };
      expect(evaluateAchievements(state690).map((a) => a.id)).not.toContain('level_5');

      const state700: GamificationEvaluationState = {
        ...baseState,
        totalXp: 700,
      };
      expect(evaluateAchievements(state700).map((a) => a.id)).toContain('level_5');
    });
  });
});
