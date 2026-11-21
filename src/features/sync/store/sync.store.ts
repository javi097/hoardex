import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { SyncStatus } from '@/interfaces/sync.interface';

export interface PendingDeletions {
  collectionIds: string[];
  itemIds: string[];
}

export interface SyncState {
  user: User | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  pendingDeletionIds: PendingDeletions;

  setUser: (user: User | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
  trackDeletedCollection: (id: string) => void;
  trackDeletedItem: (id: string) => void;
  clearPendingDeletions: () => void;
  resetSyncState: () => void;
}

const INITIAL_DELETIONS: PendingDeletions = {
  collectionIds: [],
  itemIds: [],
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      user: null,
      syncStatus: 'local',
      lastSyncedAt: null,
      pendingDeletionIds: INITIAL_DELETIONS,

      setUser: (user) => set({ user }),

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

      trackDeletedCollection: (id) =>
        set((state) => ({
          pendingDeletionIds: {
            ...state.pendingDeletionIds,
            collectionIds: state.pendingDeletionIds.collectionIds.includes(id)
              ? state.pendingDeletionIds.collectionIds
              : [...state.pendingDeletionIds.collectionIds, id],
          },
        })),

      trackDeletedItem: (id) =>
        set((state) => ({
          pendingDeletionIds: {
            ...state.pendingDeletionIds,
            itemIds: state.pendingDeletionIds.itemIds.includes(id)
              ? state.pendingDeletionIds.itemIds
              : [...state.pendingDeletionIds.itemIds, id],
          },
        })),

      clearPendingDeletions: () =>
        set({
          pendingDeletionIds: INITIAL_DELETIONS,
        }),

      resetSyncState: () =>
        set({
          user: null,
          syncStatus: 'local',
          lastSyncedAt: null,
          pendingDeletionIds: INITIAL_DELETIONS,
        }),
    }),
    {
      name: 'hoardex-sync',
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        pendingDeletionIds: state.pendingDeletionIds,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SyncState> | undefined;
        return {
          ...currentState,
          lastSyncedAt:
            typeof persisted?.lastSyncedAt === 'string'
              ? persisted.lastSyncedAt
              : null,
          pendingDeletionIds: {
            collectionIds: Array.isArray(
              persisted?.pendingDeletionIds?.collectionIds
            )
              ? persisted.pendingDeletionIds.collectionIds.filter(
                  (id): id is string => typeof id === 'string'
                )
              : [],
            itemIds: Array.isArray(persisted?.pendingDeletionIds?.itemIds)
              ? persisted.pendingDeletionIds.itemIds.filter(
                  (id): id is string => typeof id === 'string'
                )
              : [],
          },
        };
      },
    }
  )
);
