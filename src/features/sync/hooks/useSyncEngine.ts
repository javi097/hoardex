import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useSyncStore } from '@/features/sync/store/sync.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import {
  mapCollectionRowToCollection,
  mapCollectionToRow,
  mapItemRowToItem,
  mapItemToRow,
  mapGamificationRowToState,
  mapGamificationStateToRow,
} from '../core/mappers';
import {
  reconcileEntitiesLWW,
  reconcileGamification,
} from '../core/reconciliation';
import type {
  PersistedGamificationData,
  SyncStatus,
} from '@/interfaces/sync.interface';

export interface UseSyncEngineReturn {
  syncNow: () => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
}

/**
 * Orquestador central de sincronización cloud entre los stores locales de Zustand y Supabase.
 */
export function useSyncEngine(): UseSyncEngineReturn {
  const user = useSyncStore((state) => state.user);
  const syncStatus = useSyncStore((state) => state.syncStatus);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const setSyncStatus = useSyncStore((state) => state.setSyncStatus);
  const setLastSyncedAt = useSyncStore((state) => state.setLastSyncedAt);
  const clearPendingDeletions = useSyncStore(
    (state) => state.clearPendingDeletions
  );

  const isSyncingRef = useRef(false);
  const isHydratingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingChangesRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const syncNow = async (): Promise<void> => {
    const currentUser = userRef.current;
    if (!isSupabaseConfigured || !supabase || !currentUser) {
      return;
    }

    if (isSyncingRef.current) {
      hasPendingChangesRef.current = true;
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      // 1. Procesar eliminaciones pendientes antes de descargar nada
      const { collectionIds, itemIds } =
        useSyncStore.getState().pendingDeletionIds;

      if (collectionIds.length > 0) {
        const { error: delColError } = await supabase
          .from('collections')
          .delete()
          .in('id', collectionIds)
          .eq('user_id', currentUser.id);

        if (delColError) throw delColError;
      }

      if (itemIds.length > 0) {
        const { error: delItemError } = await supabase
          .from('items')
          .delete()
          .in('id', itemIds)
          .eq('user_id', currentUser.id);

        if (delItemError) throw delItemError;
      }

      clearPendingDeletions();

      // 2. Descargar estado remoto de Supabase en paralelo
      const [colRes, itemRes, gamRes] = await Promise.all([
        supabase.from('collections').select('*').eq('user_id', currentUser.id),
        supabase.from('items').select('*').eq('user_id', currentUser.id),
        supabase
          .from('gamification_state')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle(),
      ]);

      if (colRes.error) throw colRes.error;
      if (itemRes.error) throw itemRes.error;
      if (gamRes.error) throw gamRes.error;

      // 3. Mapear datos remotos a contratos de dominio
      const remoteCols = (colRes.data ?? []).map(mapCollectionRowToCollection);
      const remoteItems = (itemRes.data ?? []).map(mapItemRowToItem);
      const remoteGam = gamRes.data
        ? mapGamificationRowToState(gamRes.data)
        : null;

      // 4. Leer estado local actual
      const localCols = useCollectionsStore.getState().collections;
      const localItems = useItemsStore.getState().items;
      const currentGam = useGamificationStore.getState();
      const localGam: PersistedGamificationData = {
        totalXp: currentGam.totalXp,
        streak: currentGam.streak,
        unlockedAchievements: currentGam.unlockedAchievements,
        claimedChallengeIds: currentGam.claimedChallengeIds,
        rewardedCollectionIds: currentGam.rewardedCollectionIds,
        xpHistory: currentGam.xpHistory,
      };

      // 5. Conciliar deterministamente mediante LWW y unión idempotente
      const reconciledCols = reconcileEntitiesLWW(localCols, remoteCols);
      const reconciledItems = reconcileEntitiesLWW(localItems, remoteItems);
      const reconciledGam = remoteGam
        ? reconcileGamification(localGam, remoteGam)
        : localGam;

      // 6. Hidratar stores locales sin disparar el listener de mutaciones
      isHydratingRef.current = true;
      try {
        useCollectionsStore.getState().hydrateCollections(reconciledCols);
        useItemsStore.getState().hydrateItems(reconciledItems);
        useGamificationStore.getState().hydrateGamification(reconciledGam);
      } finally {
        setTimeout(() => {
          isHydratingRef.current = false;
        }, 100);
      }

      // 7. Subir datos consolidados a Supabase (upsert)
      const now = new Date().toISOString();

      if (reconciledCols.length > 0) {
        const rows = reconciledCols.map((col) =>
          mapCollectionToRow(col, currentUser.id, now)
        );
        const { error: upsertColError } = await supabase
          .from('collections')
          .upsert(rows);
        if (upsertColError) throw upsertColError;
      }

      if (reconciledItems.length > 0) {
        const rows = reconciledItems.map((item) =>
          mapItemToRow(item, currentUser.id, now)
        );
        const { error: upsertItemError } = await supabase
          .from('items')
          .upsert(rows);
        if (upsertItemError) throw upsertItemError;
      }

      const gamRow = mapGamificationStateToRow(
        reconciledGam,
        currentUser.id,
        now
      );
      const { error: upsertGamError } = await supabase
        .from('gamification_state')
        .upsert(gamRow);
      if (upsertGamError) throw upsertGamError;

      // 8. Actualizar estado de sincronización con éxito
      setLastSyncedAt(now);
      setSyncStatus('synced');
    } catch (err: unknown) {
      console.error('Error during synchronization:', err);
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;

      // Si llegaron cambios mientras se sincronizaba, programar nuevo ciclo debounced
      if (hasPendingChangesRef.current && userRef.current) {
        hasPendingChangesRef.current = false;
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          void syncNow();
        }, 1500);
      }
    }
  };

  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  });

  // Sincronización inicial automática al autenticarse o cambiar de usuario
  const prevUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && user.id !== prevUserRef.current) {
      prevUserRef.current = user.id;
      void syncNowRef.current();
    } else if (!user) {
      prevUserRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
  }, [user]);

  // Suscripción con debounce (1500 ms) ante mutaciones locales cuando el usuario está autenticado
  useEffect(() => {
    if (!user) {
      return;
    }

    const triggerDebouncedSync = () => {
      if (isHydratingRef.current || !userRef.current) {
        return;
      }

      if (isSyncingRef.current) {
        hasPendingChangesRef.current = true;
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void syncNowRef.current();
      }, 1500);
    };

    const unsubCols = useCollectionsStore.subscribe(triggerDebouncedSync);
    const unsubItems = useItemsStore.subscribe(triggerDebouncedSync);
    const unsubGam = useGamificationStore.subscribe(triggerDebouncedSync);

    return () => {
      unsubCols();
      unsubItems();
      unsubGam();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [user]);

  // Sincronización en foco de ventana o reconexión de red
  useEffect(() => {
    const handleReFocus = () => {
      if (
        userRef.current &&
        !isSyncingRef.current &&
        !isHydratingRef.current &&
        isSupabaseConfigured &&
        supabase
      ) {
        void syncNowRef.current();
      }
    };

    window.addEventListener('focus', handleReFocus);
    window.addEventListener('online', handleReFocus);

    return () => {
      window.removeEventListener('focus', handleReFocus);
      window.removeEventListener('online', handleReFocus);
    };
  }, []);

  return {
    syncNow,
    syncStatus,
    lastSyncedAt,
  };
}
