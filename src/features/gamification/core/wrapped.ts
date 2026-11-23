import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import type {
  WrappedStats,
  WrappedCollectionBreakdown,
  WrappedTopItem,
  StreakInfo,
} from '@/interfaces/gamification.interface';
import { calculateLevelProgress } from './levels';

export interface WrappedGamificationInput {
  totalXp: number;
  streak: StreakInfo;
}

/**
 * Calcula de forma 100% pura y determinista las estadísticas anuales de Hoardex Wrapped.
 * No depende de `new Date()` sin parámetro ni del DOM.
 */
export function calculateWrappedStats(
  collections: Collection[],
  items: Item[],
  gamification: WrappedGamificationInput,
  targetYear: number
): WrappedStats {
  const yearStr = String(targetYear);

  // Mapeo rápido de colecciones
  const collectionMap = new Map<string, Collection>();
  for (const col of collections) {
    collectionMap.set(col.id, col);
  }

  // Comprobar si un ítem está marcado como completado según los estados de su colección
  const isItemCompleted = (item: Item): boolean => {
    const col = collectionMap.get(item.collectionId);
    if (!col) return false;
    const status = col.statuses.find((s) => s.id === item.statusId);
    return status?.isCompleted === true;
  };

  // 1. Ítems añadidos en el año objetivo
  const itemsAddedInYear = items.filter((item) =>
    item.createdAt.startsWith(yearStr)
  );
  const totalAdded = itemsAddedInYear.length;

  // 2. Ítems completados en el año objetivo
  const itemsCompletedInYear = items.filter((item) => {
    if (!isItemCompleted(item)) return false;
    const completionDate = item.completedAt ?? item.updatedAt ?? item.createdAt;
    return completionDate.startsWith(yearStr);
  });
  const totalCompleted = itemsCompletedInYear.length;

  // 3. Tasa de completitud
  const completionRate =
    totalAdded > 0
      ? Math.min(100, Math.max(0, Math.round((totalCompleted / totalAdded) * 100)))
      : totalCompleted > 0
        ? 100
        : 0;

  // 4. Ítems con actividad en el año (añadidos, completados o actualizados en ese año)
  const itemsActiveInYear = items.filter((item) => {
    return (
      item.createdAt.startsWith(yearStr) ||
      (item.updatedAt && item.updatedAt.startsWith(yearStr)) ||
      (item.completedAt && item.completedAt.startsWith(yearStr))
    );
  });

  // 5. Valoración media de ítems puntuados en el año
  const ratedItemsInYear = itemsActiveInYear.filter(
    (item) => typeof item.rating === 'number' && item.rating > 0
  );

  const averageRating =
    ratedItemsInYear.length > 0
      ? Math.round(
          (ratedItemsInYear.reduce((acc, it) => acc + (it.rating ?? 0), 0) /
            ratedItemsInYear.length) *
            10
        ) / 10
      : null;

  // 6. Desglose de colecciones y Colección Reina (favorita)
  const collectionActivityCount = new Map<
    string,
    { total: number; completed: number }
  >();

  for (const it of itemsActiveInYear) {
    const current = collectionActivityCount.get(it.collectionId) ?? {
      total: 0,
      completed: 0,
    };
    current.total += 1;
    if (isItemCompleted(it)) {
      current.completed += 1;
    }
    collectionActivityCount.set(it.collectionId, current);
  }

  const collectionsBreakdown: WrappedCollectionBreakdown[] = [];
  const totalActiveItemsCount = itemsActiveInYear.length;

  for (const [colId, counts] of collectionActivityCount.entries()) {
    const col = collectionMap.get(colId);
    if (!col) continue;

    const percentage =
      totalActiveItemsCount > 0
        ? Math.round((counts.total / totalActiveItemsCount) * 100)
        : 0;

    collectionsBreakdown.push({
      collectionId: col.id,
      collectionName: col.name,
      accentColor: col.accentColor,
      icon: col.icon,
      itemsCount: counts.total,
      percentage,
    });
  }

  // Ordenar desglose: más actividad primero, desempate por completados y nombre
  collectionsBreakdown.sort((a, b) => {
    if (b.itemsCount !== a.itemsCount) {
      return b.itemsCount - a.itemsCount;
    }
    const countsA = collectionActivityCount.get(a.collectionId)?.completed ?? 0;
    const countsB = collectionActivityCount.get(b.collectionId)?.completed ?? 0;
    if (countsB !== countsA) {
      return countsB - countsA;
    }
    return a.collectionName.localeCompare(b.collectionName);
  });

  const favoriteCollection =
    collectionsBreakdown.length > 0 ? collectionsBreakdown[0] : null;

  // 7. Top 5 ítems mejor puntuados
  const sortedTopItems = [...ratedItemsInYear].sort((a, b) => {
    const ratingB = b.rating ?? 0;
    const ratingA = a.rating ?? 0;
    if (ratingB !== ratingA) return ratingB - ratingA;
    const dateB = b.updatedAt ?? b.createdAt;
    const dateA = a.updatedAt ?? a.createdAt;
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return a.title.localeCompare(b.title);
  });

  const topRatedItems: WrappedTopItem[] = sortedTopItems
    .slice(0, 5)
    .map((it) => {
      const col = collectionMap.get(it.collectionId);
      return {
        id: it.id,
        title: it.title,
        collectionName: col?.name ?? 'Colección',
        rating: it.rating ?? 0,
        releaseYear: it.releaseYear,
        coverUrl: it.coverUrl,
      };
    });

  // 8. Información de nivel y racha
  const levelInfo = calculateLevelProgress(gamification.totalXp ?? 0);
  const hasActivity =
    totalAdded > 0 || totalCompleted > 0 || itemsActiveInYear.length > 0;

  return {
    year: targetYear,
    hasActivity,
    totalAdded,
    totalCompleted,
    completionRate,
    averageRating,
    favoriteCollection,
    collectionsBreakdown,
    topRatedItems,
    longestStreak: gamification.streak?.longestStreak ?? 0,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    totalXp: gamification.totalXp ?? 0,
  };
}
