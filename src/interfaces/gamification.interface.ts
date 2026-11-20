export type XpActionType =
  | 'add_item'
  | 'complete_item'
  | 'rate_and_review'
  | 'complete_collection'
  | 'daily_streak'
  | 'achievement';

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
