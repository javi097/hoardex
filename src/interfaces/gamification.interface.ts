export type XpActionType =
  | 'create_collection'
  | 'add_item'
  | 'complete_item'
  | 'rate_and_review'
  | 'complete_collection'
  | 'daily_streak'
  | 'achievement'
  | 'challenge';

export interface XpEvent {
  id: string;
  action: XpActionType;
  xpGained: number;
  description: string;
  targetId?: string;
  timestamp: string;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  totalXp: number;
  progressPercentage: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // Formato 'YYYY-MM-DD'
  isActiveToday: boolean;
}

export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  isExtended: boolean;
}

export type AchievementCategory =
  | 'all'
  | 'catalog'
  | 'completion'
  | 'reviews'
  | 'streaks'
  | 'special';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface GamificationEvaluationState {
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
  totalXp: number;
  streak: StreakInfo;
  alreadyUnlockedIds: Set<string>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Nombre del icono en lucide-react
  category: Exclude<AchievementCategory, 'all'>;
  tier: AchievementTier;
  xpReward: number;
  condition: (state: GamificationEvaluationState) => boolean;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Contratos de Retos Dinámicos y Analíticas del Coleccionista (Fase 3b)
// ---------------------------------------------------------------------------

export type ChallengeCategory = 'weekly' | 'milestone';

export interface WeekBoundaries {
  weekKey: string; // Formato 'YYYY-Www', ej. '2026-W47'
  startOfWeek: string; // Formato 'YYYY-MM-DD' (Lunes 00:00 UTC)
  endOfWeek: string; // Formato 'YYYY-MM-DD' (Domingo 23:59 UTC)
}

export interface ChallengeEvaluationState {
  collections: {
    id: string;
    name: string;
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
    createdAt: string;
    updatedAt: string;
    meta?: Record<string, unknown>;
  }[];
  xpHistory: XpEvent[];
  totalXp: number;
  streak: StreakInfo;
  claimedChallengeIds: string[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  icon: string; // Nombre del icono en lucide-react
  target: number;
  xpReward: number;
  computeProgress: (
    state: ChallengeEvaluationState,
    today: string,
    boundaries: WeekBoundaries
  ) => number;
}

export interface ChallengeProgress {
  challengeId: string;
  uniqueKey: string; // id o `${id}_${weekKey}` para retos semanales
  title: string;
  description: string;
  category: ChallengeCategory;
  icon: string;
  current: number;
  target: number;
  percentage: number;
  xpReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface CollectorStats {
  totalItems: number;
  completedItems: number;
  completionRate: number; // 0..100
  ratedItemsCount: number;
  averageRating: number; // 0.0..5.0 con 1 decimal
  reviewedItemsCount: number;
  totalCollections: number;
  mostActiveCollection: {
    name: string;
    itemCount: number;
    completedCount: number;
  } | null;
}
