import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Achievement,
  GamificationEvaluationState,
  StreakInfo,
  UnlockedAchievement,
  XpActionType,
  XpEvent,
} from '@/interfaces/gamification.interface';
import { calculateLevelProgress, XP_RULES } from '../core/levels';
import { calculateStreak } from '../core/streaks';
import { evaluateAchievements } from '../core/achievements';

export interface UserActionParams {
  action: XpActionType;
  xpGained?: number;
  description: string;
  targetId?: string;
  today: string; // 'YYYY-MM-DD'
  now: string; // ISO 8601
  collections: {
    id: string;
    statuses: { id: string; isCompleted: boolean }[];
  }[];
  items: {
    id: string;
    collectionId: string;
    statusId: string;
    xpAwarded?: boolean;
    rating?: number;
    notes?: string;
    reviewXpAwarded?: boolean;
  }[];
}

export interface ActionResult {
  totalXpGained: number;
  baseXpGained: number;
  streakBonusXp: number;
  collectionBonusXp: number;
  achievementBonusXp: number;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  newLevelTitle: string;
  newlyUnlockedAchievements: Achievement[];
  streakExtended: boolean;
  currentStreak: number;
}

export interface SyncAchievementsParams {
  today: string;
  now: string;
  collections: {
    id: string;
    statuses: { id: string; isCompleted: boolean }[];
  }[];
  items: {
    id: string;
    collectionId: string;
    statusId: string;
    xpAwarded?: boolean;
    rating?: number;
    notes?: string;
    reviewXpAwarded?: boolean;
  }[];
}

export interface ClaimChallengeRewardParams {
  uniqueKey: string;
  xpReward: number;
  title: string;
  now: string;
  isCompleted: boolean;
}

export interface GamificationState {
  totalXp: number;
  streak: StreakInfo;
  unlockedAchievements: UnlockedAchievement[];
  xpHistory: XpEvent[];
  rewardedCollectionIds: string[];
  claimedChallengeIds: string[];

  // Acciones
  handleUserAction: (params: UserActionParams) => ActionResult;
  syncAchievements: (params: SyncAchievementsParams) => ActionResult;
  claimChallengeReward: (params: ClaimChallengeRewardParams) => ActionResult;
  awardXp: (
    action: XpActionType,
    amount: number,
    description: string,
    now: string,
    targetId?: string
  ) => void;
  resetGamification: () => void;
}

const DEFAULT_STREAK: StreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  isActiveToday: false,
};

function getBaseActionXp(action: XpActionType, customXp?: number): number {
  if (customXp !== undefined) {
    return Math.max(0, customXp);
  }
  switch (action) {
    case 'create_collection':
      return 0;
    case 'add_item':
      return XP_RULES.ADD_ITEM;
    case 'complete_item':
      return XP_RULES.COMPLETE_ITEM;
    case 'rate_and_review':
      return XP_RULES.RATE_AND_REVIEW;
    case 'complete_collection':
      return XP_RULES.COMPLETE_COLLECTION;
    case 'daily_streak':
      return XP_RULES.DAILY_STREAK_BONUS;
    case 'achievement':
    case 'challenge':
    default:
      return 0;
  }
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      streak: DEFAULT_STREAK,
      unlockedAchievements: [],
      xpHistory: [],
      rewardedCollectionIds: [],
      claimedChallengeIds: [],

      handleUserAction: (params) => {
        const state = get();
        const previousProgress = calculateLevelProgress(state.totalXp);

        // 1. Cálculo de racha diaria determinista
        const streakResult = calculateStreak(
          state.streak.currentStreak,
          state.streak.longestStreak,
          state.streak.lastActivityDate,
          params.today
        );

        const streakBonus = streakResult.isExtended
          ? XP_RULES.DAILY_STREAK_BONUS
          : 0;

        const newStreak: StreakInfo = {
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastActivityDate: streakResult.lastActivityDate,
          isActiveToday: true,
        };

        // 2. Cálculo del XP base de la acción
        const baseXp = getBaseActionXp(params.action, params.xpGained);

        // 3. Comprobar bono del 100% en colecciones completadas (mínimo 3 ítems)
        let collectionBonusXp = 0;
        const newRewardedCollectionIds = [...state.rewardedCollectionIds];
        const collectionEvents: XpEvent[] = [];

        for (const col of params.collections) {
          if (newRewardedCollectionIds.includes(col.id)) continue;
          const colItems = params.items.filter((it) => it.collectionId === col.id);
          if (colItems.length >= 3 && colItems.every((it) => it.xpAwarded)) {
            newRewardedCollectionIds.push(col.id);
            collectionBonusXp += XP_RULES.COMPLETE_COLLECTION;
            collectionEvents.push({
              id: crypto.randomUUID(),
              action: 'complete_collection',
              xpGained: XP_RULES.COMPLETE_COLLECTION,
              description: '¡Colección completada al 100%!',
              targetId: col.id,
              timestamp: params.now,
            });
          }
        }

        // 4. Evaluar logros sobre el estado intermedio
        const interimXp =
          state.totalXp + baseXp + streakBonus + collectionBonusXp;

        const alreadyUnlockedIds = new Set(
          state.unlockedAchievements.map((u) => u.achievementId)
        );

        const evaluationState: GamificationEvaluationState = {
          collections: params.collections,
          items: params.items,
          totalXp: interimXp,
          streak: newStreak,
          alreadyUnlockedIds,
        };

        const newlyUnlocked = evaluateAchievements(evaluationState);
        const achievementBonusXp = newlyUnlocked.reduce(
          (sum, ach) => sum + ach.xpReward,
          0
        );

        const newUnlockedEntries: UnlockedAchievement[] = newlyUnlocked.map(
          (ach) => ({
            achievementId: ach.id,
            unlockedAt: params.now,
          })
        );

        // 5. Progreso y nivel final
        const finalXp = interimXp + achievementBonusXp;
        const finalProgress = calculateLevelProgress(finalXp);
        const leveledUp = finalProgress.level > previousProgress.level;

        // 6. Registro de eventos en el historial
        const newEvents: XpEvent[] = [];

        if (baseXp > 0) {
          newEvents.push({
            id: crypto.randomUUID(),
            action: params.action,
            xpGained: baseXp,
            description: params.description,
            targetId: params.targetId,
            timestamp: params.now,
          });
        }

        if (streakBonus > 0) {
          newEvents.push({
            id: crypto.randomUUID(),
            action: 'daily_streak',
            xpGained: streakBonus,
            description: `¡Racha diaria extendida a ${newStreak.currentStreak} día${newStreak.currentStreak === 1 ? '' : 's'}!`,
            timestamp: params.now,
          });
        }

        newEvents.push(...collectionEvents);

        for (const ach of newlyUnlocked) {
          newEvents.push({
            id: crypto.randomUUID(),
            action: 'achievement',
            xpGained: ach.xpReward,
            description: `Logro desbloqueado: ${ach.title}`,
            targetId: ach.id,
            timestamp: params.now,
          });
        }

        const newXpHistory = [...newEvents, ...state.xpHistory].slice(0, 50);

        // 7. Persistir estado de forma atómica e inmutable
        set({
          totalXp: finalXp,
          streak: newStreak,
          unlockedAchievements: [
            ...state.unlockedAchievements,
            ...newUnlockedEntries,
          ],
          xpHistory: newXpHistory,
          rewardedCollectionIds: newRewardedCollectionIds,
        });

        return {
          totalXpGained:
            baseXp + streakBonus + collectionBonusXp + achievementBonusXp,
          baseXpGained: baseXp,
          streakBonusXp: streakBonus,
          collectionBonusXp,
          achievementBonusXp,
          leveledUp,
          previousLevel: previousProgress.level,
          newLevel: finalProgress.level,
          newLevelTitle: finalProgress.title,
          newlyUnlockedAchievements: newlyUnlocked,
          streakExtended: streakResult.isExtended,
          currentStreak: newStreak.currentStreak,
        };
      },

      syncAchievements: (params) => {
        const state = get();
        const previousProgress = calculateLevelProgress(state.totalXp);

        // Actualizar isActiveToday según la fecha
        const isActiveToday =
          state.streak.lastActivityDate === params.today &&
          state.streak.currentStreak > 0;

        const currentStreakInfo: StreakInfo = {
          ...state.streak,
          isActiveToday,
        };

        // Comprobar bono de colección completa para colecciones ya terminadas
        let collectionBonusXp = 0;
        const newRewardedCollectionIds = [...state.rewardedCollectionIds];
        const collectionEvents: XpEvent[] = [];

        for (const col of params.collections) {
          if (newRewardedCollectionIds.includes(col.id)) continue;
          const colItems = params.items.filter((it) => it.collectionId === col.id);
          if (colItems.length >= 3 && colItems.every((it) => it.xpAwarded)) {
            newRewardedCollectionIds.push(col.id);
            collectionBonusXp += XP_RULES.COMPLETE_COLLECTION;
            collectionEvents.push({
              id: crypto.randomUUID(),
              action: 'complete_collection',
              xpGained: XP_RULES.COMPLETE_COLLECTION,
              description: '¡Colección completada al 100%!',
              targetId: col.id,
              timestamp: params.now,
            });
          }
        }

        const interimXp = state.totalXp + collectionBonusXp;
        const alreadyUnlockedIds = new Set(
          state.unlockedAchievements.map((u) => u.achievementId)
        );

        const evaluationState: GamificationEvaluationState = {
          collections: params.collections,
          items: params.items,
          totalXp: interimXp,
          streak: currentStreakInfo,
          alreadyUnlockedIds,
        };

        const newlyUnlocked = evaluateAchievements(evaluationState);
        const achievementBonusXp = newlyUnlocked.reduce(
          (sum, ach) => sum + ach.xpReward,
          0
        );

        const newUnlockedEntries: UnlockedAchievement[] = newlyUnlocked.map(
          (ach) => ({
            achievementId: ach.id,
            unlockedAt: params.now,
          })
        );

        const finalXp = interimXp + achievementBonusXp;
        const finalProgress = calculateLevelProgress(finalXp);
        const leveledUp = finalProgress.level > previousProgress.level;

        const newEvents: XpEvent[] = [...collectionEvents];
        for (const ach of newlyUnlocked) {
          newEvents.push({
            id: crypto.randomUUID(),
            action: 'achievement',
            xpGained: ach.xpReward,
            description: `Logro desbloqueado: ${ach.title}`,
            targetId: ach.id,
            timestamp: params.now,
          });
        }

        const newXpHistory = [...newEvents, ...state.xpHistory].slice(0, 50);

        set({
          totalXp: finalXp,
          streak: currentStreakInfo,
          unlockedAchievements: [
            ...state.unlockedAchievements,
            ...newUnlockedEntries,
          ],
          xpHistory: newXpHistory,
          rewardedCollectionIds: newRewardedCollectionIds,
        });

        return {
          totalXpGained: collectionBonusXp + achievementBonusXp,
          baseXpGained: 0,
          streakBonusXp: 0,
          collectionBonusXp,
          achievementBonusXp,
          leveledUp,
          previousLevel: previousProgress.level,
          newLevel: finalProgress.level,
          newLevelTitle: finalProgress.title,
          newlyUnlockedAchievements: newlyUnlocked,
          streakExtended: false,
          currentStreak: currentStreakInfo.currentStreak,
        };
      },

      claimChallengeReward: (params) => {
        const state = get();
        const currentProgress = calculateLevelProgress(state.totalXp);

        // Validación dual: debe estar completado y NO estar ya reclamado
        if (
          !params.isCompleted ||
          state.claimedChallengeIds.includes(params.uniqueKey)
        ) {
          return {
            totalXpGained: 0,
            baseXpGained: 0,
            streakBonusXp: 0,
            collectionBonusXp: 0,
            achievementBonusXp: 0,
            leveledUp: false,
            previousLevel: currentProgress.level,
            newLevel: currentProgress.level,
            newLevelTitle: currentProgress.title,
            newlyUnlockedAchievements: [],
            streakExtended: false,
            currentStreak: state.streak.currentStreak,
          };
        }

        const safeReward = Math.max(0, Math.floor(params.xpReward));
        const finalXp = state.totalXp + safeReward;
        const finalProgress = calculateLevelProgress(finalXp);
        const leveledUp = finalProgress.level > currentProgress.level;

        const newEvent: XpEvent = {
          id: crypto.randomUUID(),
          action: 'challenge',
          xpGained: safeReward,
          description: `Reto completado: ${params.title}`,
          targetId: params.uniqueKey,
          timestamp: params.now,
        };

        const newXpHistory = [newEvent, ...state.xpHistory].slice(0, 50);
        const newClaimedIds = [...state.claimedChallengeIds, params.uniqueKey];

        set({
          totalXp: finalXp,
          claimedChallengeIds: newClaimedIds,
          xpHistory: newXpHistory,
        });

        return {
          totalXpGained: safeReward,
          baseXpGained: safeReward,
          streakBonusXp: 0,
          collectionBonusXp: 0,
          achievementBonusXp: 0,
          leveledUp,
          previousLevel: currentProgress.level,
          newLevel: finalProgress.level,
          newLevelTitle: finalProgress.title,
          newlyUnlockedAchievements: [],
          streakExtended: false,
          currentStreak: state.streak.currentStreak,
        };
      },

      awardXp: (action, amount, description, now, targetId) => {
        const safeAmount = Math.max(0, Math.floor(amount));
        if (safeAmount === 0) return;

        set((state) => {
          const newTotalXp = state.totalXp + safeAmount;
          const event: XpEvent = {
            id: crypto.randomUUID(),
            action,
            xpGained: safeAmount,
            description,
            targetId,
            timestamp: now,
          };
          return {
            totalXp: newTotalXp,
            xpHistory: [event, ...state.xpHistory].slice(0, 50),
          };
        });
      },

      resetGamification: () => {
        set({
          totalXp: 0,
          streak: DEFAULT_STREAK,
          unlockedAchievements: [],
          xpHistory: [],
          rewardedCollectionIds: [],
          claimedChallengeIds: [],
        });
      },
    }),
    {
      name: 'hoardex-gamification',
      partialize: (state) => ({
        totalXp: state.totalXp,
        streak: state.streak,
        unlockedAchievements: state.unlockedAchievements,
        xpHistory: state.xpHistory,
        rewardedCollectionIds: state.rewardedCollectionIds,
        claimedChallengeIds: state.claimedChallengeIds,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<GamificationState>
          | undefined;

        return {
          ...currentState,
          totalXp:
            typeof persisted?.totalXp === 'number' &&
            !isNaN(persisted.totalXp)
              ? Math.max(0, persisted.totalXp)
              : 0,
          streak: {
            currentStreak:
              typeof persisted?.streak?.currentStreak === 'number'
                ? Math.max(0, persisted.streak.currentStreak)
                : 0,
            longestStreak:
              typeof persisted?.streak?.longestStreak === 'number'
                ? Math.max(0, persisted.streak.longestStreak)
                : 0,
            lastActivityDate:
              typeof persisted?.streak?.lastActivityDate === 'string'
                ? persisted.streak.lastActivityDate
                : null,
            isActiveToday: Boolean(persisted?.streak?.isActiveToday),
          },
          unlockedAchievements: Array.isArray(persisted?.unlockedAchievements)
            ? persisted.unlockedAchievements
            : [],
          xpHistory: Array.isArray(persisted?.xpHistory)
            ? persisted.xpHistory
            : [],
          rewardedCollectionIds: Array.isArray(
            persisted?.rewardedCollectionIds
          )
            ? persisted.rewardedCollectionIds
            : [],
          claimedChallengeIds: Array.isArray(persisted?.claimedChallengeIds)
            ? persisted.claimedChallengeIds.filter(
                (id) => typeof id === 'string'
              )
            : [],
        };
      },
    }
  )
);
