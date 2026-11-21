import type { Collection, CollectionStatus } from './collection.interface';
import type { Item } from './item.interface';
import type {
  StreakInfo,
  UnlockedAchievement,
  XpEvent,
} from './gamification.interface';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

/**
 * Fila relacional en PostgreSQL para colecciones (Supabase snake_case).
 */
export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  accent_color: string;
  provider: string;
  statuses: CollectionStatus[];
  created_at: string;
  updated_at: string;
}

/**
 * Fila relacional en PostgreSQL para ítems catalogados (Supabase snake_case).
 */
export interface ItemRow {
  id: string;
  user_id: string;
  collection_id: string;
  title: string;
  subtitle: string | null;
  release_year: number | null;
  cover_url: string | null;
  status_id: string;
  rating: number | null;
  notes: string | null;
  meta: Record<string, unknown>;
  xp_awarded: boolean;
  review_xp_awarded: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fila relacional en PostgreSQL para el estado consolidado de gamificación (Supabase snake_case).
 */
export interface GamificationStateRow {
  user_id: string;
  total_xp: number;
  streak: StreakInfo;
  unlocked_achievements: UnlockedAchievement[];
  claimed_challenge_ids: string[];
  rewarded_collection_ids: string[];
  xp_history: XpEvent[];
  updated_at: string;
}

/**
 * Estado completo de gamificación desacoplado de Zustand para conciliación y copias de seguridad.
 */
export interface PersistedGamificationData {
  totalXp: number;
  streak: StreakInfo;
  unlockedAchievements: UnlockedAchievement[];
  claimedChallengeIds: string[];
  rewardedCollectionIds: string[];
  xpHistory: XpEvent[];
}

/**
 * Formato oficial versionado de respaldo local JSON de Hoardex.
 */
export interface HoardexBackup {
  version: 1;
  exportedAt: string;
  collections: Collection[];
  items: Item[];
  gamification: PersistedGamificationData;
}
