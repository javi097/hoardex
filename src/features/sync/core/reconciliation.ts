import type {
  StreakInfo,
  UnlockedAchievement,
  XpEvent,
} from '@/interfaces/gamification.interface';
import type { PersistedGamificationData } from '@/interfaces/sync.interface';

/**
 * Entidad con identificador y marcas temporales para resolución Last-Write-Wins.
 */
export interface TimestampedEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

function getTimestampMs(entity: TimestampedEntity): number {
  const iso = entity.updatedAt ?? entity.createdAt;
  if (!iso) return 0;
  const parsed = new Date(iso).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Concilia dos colecciones de entidades mediante la estrategia Last-Write-Wins (LWW)
 * basada en la marca temporal updatedAt (o createdAt como fallback).
 * Si un elemento solo existe en un lado, se conserva en el resultado.
 */
export function reconcileEntitiesLWW<T extends TimestampedEntity>(
  local: T[],
  remote: T[]
): T[] {
  const resultMap = new Map<string, T>();

  // 1. Insertar todos los elementos remotos
  for (const item of remote) {
    resultMap.set(item.id, item);
  }

  // 2. Conciliar con elementos locales
  for (const localItem of local) {
    const remoteItem = resultMap.get(localItem.id);

    if (!remoteItem) {
      // Solo en local: conservar
      resultMap.set(localItem.id, localItem);
    } else {
      // En ambos: comparar marcas temporales LWW
      const localTime = getTimestampMs(localItem);
      const remoteTime = getTimestampMs(remoteItem);

      if (localTime >= remoteTime) {
        resultMap.set(localItem.id, localItem);
      }
      // Si remoteTime > localTime, ya se mantiene remoteItem
    }
  }

  return Array.from(resultMap.values());
}

/**
 * Concilia dos rachas seleccionando la más reciente o la de mayor valor.
 */
function reconcileStreaks(local: StreakInfo, remote: StreakInfo): StreakInfo {
  const localDate = local.lastActivityDate ?? '';
  const remoteDate = remote.lastActivityDate ?? '';

  if (localDate > remoteDate) {
    return local;
  }
  if (remoteDate > localDate) {
    return remote;
  }

  // Mismo día de actividad o ambos null: tomar el mejor progreso
  return {
    currentStreak: Math.max(local.currentStreak, remote.currentStreak),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    lastActivityDate: local.lastActivityDate ?? remote.lastActivityDate,
    isActiveToday: local.isActiveToday || remote.isActiveToday,
  };
}

/**
 * Concilia dos listas de logros desbloqueados asegurando unión única e idempotente,
 * conservando la fecha de desbloqueo más antigua (primer momento de obtención).
 */
function reconcileAchievements(
  local: UnlockedAchievement[],
  remote: UnlockedAchievement[]
): UnlockedAchievement[] {
  const achievementMap = new Map<string, UnlockedAchievement>();

  for (const item of [...local, ...remote]) {
    const existing = achievementMap.get(item.achievementId);
    if (!existing) {
      achievementMap.set(item.achievementId, item);
    } else {
      const existingTime = new Date(existing.unlockedAt).getTime();
      const itemTime = new Date(item.unlockedAt).getTime();
      if (itemTime < existingTime) {
        achievementMap.set(item.achievementId, item);
      }
    }
  }

  return Array.from(achievementMap.values());
}

/**
 * Concilia el historial de eventos de XP deduplicando por ID, ordenando cronológicamente
 * en orden descendente y limitando a un máximo de 50 eventos.
 */
function reconcileXpHistory(local: XpEvent[], remote: XpEvent[]): XpEvent[] {
  const eventMap = new Map<string, XpEvent>();

  for (const event of [...local, ...remote]) {
    if (!eventMap.has(event.id)) {
      eventMap.set(event.id, event);
    }
  }

  return Array.from(eventMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);
}

/**
 * Fusión matemática e idempotente del estado de gamificación local y remoto.
 */
export function reconcileGamification(
  local: PersistedGamificationData,
  remote: PersistedGamificationData
): PersistedGamificationData {
  return {
    totalXp: Math.max(local.totalXp, remote.totalXp),
    streak: reconcileStreaks(local.streak, remote.streak),
    unlockedAchievements: reconcileAchievements(
      local.unlockedAchievements,
      remote.unlockedAchievements
    ),
    claimedChallengeIds: Array.from(
      new Set([...local.claimedChallengeIds, ...remote.claimedChallengeIds])
    ),
    rewardedCollectionIds: Array.from(
      new Set([...local.rewardedCollectionIds, ...remote.rewardedCollectionIds])
    ),
    xpHistory: reconcileXpHistory(local.xpHistory, remote.xpHistory),
  };
}
