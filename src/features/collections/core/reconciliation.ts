import type { CollectionStatus } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';

export interface ReconcileResult {
  updatedItems: Item[];
  reassignedCount: number;
}

export function reconcileOrphanItems(
  items: Item[],
  validStatuses: CollectionStatus[],
  collectionId: string,
  now: string
): ReconcileResult {
  if (validStatuses.length === 0) {
    throw new Error('La colección debe tener al menos un estado válido.');
  }

  // El estado de destino para huérfanos es el primer estado ordenado
  const sortedStatuses = [...validStatuses].sort((a, b) => a.order - b.order);
  const fallbackStatus = sortedStatuses[0];
  const validStatusIds = new Set(validStatuses.map((s) => s.id));

  let reassignedCount = 0;

  const updatedItems = items.map((item) => {
    // No modificar ítems de otras colecciones
    if (item.collectionId !== collectionId) {
      return item;
    }

    // Si el estado del ítem ya no existe en la colección, reasignarlo
    if (!validStatusIds.has(item.statusId)) {
      reassignedCount++;
      const isCompleted = Boolean(fallbackStatus.isCompleted);
      const xpAwarded = item.xpAwarded || isCompleted;
      const completedAt = isCompleted
        ? item.completedAt ?? now
        : item.completedAt;

      return {
        ...item,
        statusId: fallbackStatus.id,
        xpAwarded,
        completedAt,
        updatedAt: now,
      };
    }

    return item;
  });

  return { updatedItems, reassignedCount };
}
