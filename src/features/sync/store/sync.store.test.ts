import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { useSyncStore } from './sync.store';

describe('sync.store', () => {
  beforeEach(() => {
    useSyncStore.getState().resetSyncState();
  });

  it('initializes with clean default state', () => {
    const state = useSyncStore.getState();
    expect(state.user).toBeNull();
    expect(state.syncStatus).toBe('local');
    expect(state.lastSyncedAt).toBeNull();
    expect(state.pendingDeletionIds).toEqual({
      collectionIds: [],
      itemIds: [],
    });
  });

  it('sets user, sync status and lastSyncedAt cleanly', () => {
    const mockUser = {
      id: 'u-123',
      email: 'collector@example.com',
    } as unknown as User;

    useSyncStore.getState().setUser(mockUser);
    useSyncStore.getState().setSyncStatus('syncing');
    useSyncStore.getState().setLastSyncedAt('2026-11-21T16:00:00.000Z');

    const state = useSyncStore.getState();
    expect(state.user?.id).toBe('u-123');
    expect(state.syncStatus).toBe('syncing');
    expect(state.lastSyncedAt).toBe('2026-11-21T16:00:00.000Z');
  });

  it('tracks deleted collections and items deduplicating IDs', () => {
    useSyncStore.getState().trackDeletedCollection('col-1');
    useSyncStore.getState().trackDeletedCollection('col-2');
    useSyncStore.getState().trackDeletedCollection('col-1'); // Duplicate

    useSyncStore.getState().trackDeletedItem('it-1');
    useSyncStore.getState().trackDeletedItem('it-1'); // Duplicate
    useSyncStore.getState().trackDeletedItem('it-2');

    const state = useSyncStore.getState();
    expect(state.pendingDeletionIds.collectionIds).toEqual(['col-1', 'col-2']);
    expect(state.pendingDeletionIds.itemIds).toEqual(['it-1', 'it-2']);
  });

  it('clears pending deletions with clearPendingDeletions', () => {
    useSyncStore.getState().trackDeletedCollection('col-1');
    useSyncStore.getState().trackDeletedItem('it-1');
    expect(useSyncStore.getState().pendingDeletionIds.collectionIds).toHaveLength(1);

    useSyncStore.getState().clearPendingDeletions();
    expect(useSyncStore.getState().pendingDeletionIds).toEqual({
      collectionIds: [],
      itemIds: [],
    });
  });

  it('resets all state back to initial values with resetSyncState', () => {
    useSyncStore.getState().setUser({ id: 'u-1' } as unknown as User);
    useSyncStore.getState().setSyncStatus('synced');
    useSyncStore.getState().setLastSyncedAt('2026-11-21');
    useSyncStore.getState().trackDeletedItem('it-1');

    useSyncStore.getState().resetSyncState();
    const state = useSyncStore.getState();
    expect(state.user).toBeNull();
    expect(state.syncStatus).toBe('local');
    expect(state.lastSyncedAt).toBeNull();
    expect(state.pendingDeletionIds).toEqual({ collectionIds: [], itemIds: [] });
  });
});
