import { useEffect, useRef } from 'react';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { notifyGamificationResult } from '../core/notifications';

/**
 * Hook para la sincronización inicial de gamificación al iniciar la aplicación.
 * Evalúa retroactivamente logros y bonos acumulados en sesiones previas
 * garantizando cero duplicaciones y ejecutándose una sola vez.
 */
export function useGamificationSync(): void {
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const collections = useCollectionsStore.getState().collections;
    const items = useItemsStore.getState().items;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const result = useGamificationStore.getState().syncAchievements({
      today,
      now,
      collections,
      items,
    });

    if (result.newlyUnlockedAchievements.length > 0 || result.leveledUp) {
      notifyGamificationResult(result);
    }
  }, []);
}
