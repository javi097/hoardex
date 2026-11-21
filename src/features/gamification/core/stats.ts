import type { CollectorStats } from '@/interfaces/gamification.interface';

export interface StatCollectionInput {
  id: string;
  name: string;
}

export interface StatItemInput {
  collectionId: string;
  xpAwarded?: boolean;
  rating?: number;
  notes?: string;
}

/**
 * Calcula de forma 100% pura y determinista las estadísticas cuantitativas del coleccionista.
 * Sin Date.now(), sin reloj del sistema y sin dependencias de React.
 */
export function calculateCollectorStats(
  collections: StatCollectionInput[],
  items: StatItemInput[]
): CollectorStats {
  const totalItems = items.length;
  const completedItems = items.filter((it) => Boolean(it.xpAwarded)).length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const ratedItems = items.filter(
    (it) => it.rating !== undefined && it.rating > 0
  );
  const ratedItemsCount = ratedItems.length;
  const averageRating =
    ratedItemsCount > 0
      ? Math.round(
          (ratedItems.reduce((acc, it) => acc + (it.rating ?? 0), 0) /
            ratedItemsCount) *
            10
        ) / 10
      : 0;

  const reviewedItemsCount = items.filter(
    (it) => Boolean(it.notes && it.notes.trim().length > 0)
  ).length;

  let mostActiveCollection: CollectorStats['mostActiveCollection'] = null;

  if (collections.length > 0 && totalItems > 0) {
    let maxItems = 0;
    for (const col of collections) {
      const colItems = items.filter((it) => it.collectionId === col.id);
      if (colItems.length > maxItems) {
        maxItems = colItems.length;
        const completedCount = colItems.filter((it) =>
          Boolean(it.xpAwarded)
        ).length;
        mostActiveCollection = {
          name: col.name,
          itemCount: colItems.length,
          completedCount,
        };
      }
    }
  }

  return {
    totalItems,
    completedItems,
    completionRate,
    ratedItemsCount,
    averageRating,
    reviewedItemsCount,
    totalCollections: collections.length,
    mostActiveCollection,
  };
}
