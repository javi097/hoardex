import type { Collection, ProviderType } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import type {
  CollectionRow,
  GamificationStateRow,
  ItemRow,
  PersistedGamificationData,
} from '@/interfaces/sync.interface';

const VALID_PROVIDERS: readonly ProviderType[] = [
  'manual',
  'rawg',
  'openLibrary',
  'bgg',
] as const;

function normalizeProvider(provider: string): ProviderType {
  return VALID_PROVIDERS.includes(provider as ProviderType)
    ? (provider as ProviderType)
    : 'manual';
}

/**
 * Convierte una fila de PostgreSQL/Supabase en una entidad Collection de dominio.
 */
export function mapCollectionRowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon,
    accentColor: row.accent_color,
    provider: normalizeProvider(row.provider),
    statuses: Array.isArray(row.statuses) ? row.statuses : [],
    isPublic: row.is_public ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convierte una entidad Collection de dominio en una fila para PostgreSQL/Supabase.
 */
export function mapCollectionToRow(
  collection: Collection,
  userId: string,
  now: string = collection.updatedAt ?? collection.createdAt
): CollectionRow {
  return {
    id: collection.id,
    user_id: userId,
    name: collection.name,
    description: collection.description ?? null,
    icon: collection.icon,
    accent_color: collection.accentColor,
    provider: collection.provider,
    statuses: collection.statuses,
    is_public: collection.isPublic ?? true,
    created_at: collection.createdAt,
    updated_at: collection.updatedAt ?? now,
  };
}

/**
 * Convierte una fila de PostgreSQL/Supabase en una entidad Item de dominio.
 */
export function mapItemRowToItem(row: ItemRow): Item {
  return {
    id: row.id,
    collectionId: row.collection_id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    releaseYear: row.release_year ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    statusId: row.status_id,
    rating: row.rating ?? undefined,
    notes: row.notes ?? undefined,
    meta: (row.meta as Record<string, string | number | boolean>) ?? {},
    xpAwarded: Boolean(row.xp_awarded),
    reviewXpAwarded: Boolean(row.review_xp_awarded),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convierte una entidad Item de dominio en una fila para PostgreSQL/Supabase.
 */
export function mapItemToRow(
  item: Item,
  userId: string,
  now: string = item.updatedAt ?? item.createdAt
): ItemRow {
  return {
    id: item.id,
    user_id: userId,
    collection_id: item.collectionId,
    title: item.title,
    subtitle: item.subtitle ?? null,
    release_year: item.releaseYear ?? null,
    cover_url: item.coverUrl ?? null,
    status_id: item.statusId,
    rating: item.rating ?? null,
    notes: item.notes ?? null,
    meta: item.meta ?? {},
    xp_awarded: Boolean(item.xpAwarded),
    review_xp_awarded: Boolean(item.reviewXpAwarded),
    created_at: item.createdAt,
    updated_at: item.updatedAt ?? now,
  };
}

/**
 * Convierte una fila de PostgreSQL/Supabase en un estado desacoplado de gamificación.
 */
export function mapGamificationRowToState(
  row: GamificationStateRow
): PersistedGamificationData {
  return {
    totalXp: Math.max(0, row.total_xp ?? 0),
    streak: row.streak ?? {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isActiveToday: false,
    },
    unlockedAchievements: Array.isArray(row.unlocked_achievements)
      ? row.unlocked_achievements
      : [],
    claimedChallengeIds: Array.isArray(row.claimed_challenge_ids)
      ? row.claimed_challenge_ids
      : [],
    rewardedCollectionIds: Array.isArray(row.rewarded_collection_ids)
      ? row.rewarded_collection_ids
      : [],
    xpHistory: Array.isArray(row.xp_history) ? row.xp_history : [],
  };
}

/**
 * Convierte un estado de gamificación en una fila para PostgreSQL/Supabase.
 */
export function mapGamificationStateToRow(
  data: PersistedGamificationData,
  userId: string,
  now: string
): GamificationStateRow {
  return {
    user_id: userId,
    total_xp: Math.max(0, data.totalXp),
    streak: data.streak,
    unlocked_achievements: data.unlockedAchievements,
    claimed_challenge_ids: data.claimedChallengeIds,
    rewarded_collection_ids: data.rewardedCollectionIds,
    xp_history: data.xpHistory.slice(0, 50),
    updated_at: now,
  };
}
