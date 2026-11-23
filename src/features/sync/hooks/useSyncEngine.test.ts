import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { useSyncEngine } from './useSyncEngine';
import { useSyncStore } from '@/features/sync/store/sync.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import type {
  CollectionRow,
  GamificationStateRow,
  ItemRow,
} from '@/interfaces/sync.interface';
import type { Collection } from '@/interfaces/collection.interface';

// Mocks de Supabase
let mockDbCollections: CollectionRow[] = [];
let mockDbItems: ItemRow[] = [];
let mockDbGamification: GamificationStateRow | null = null;
let mockThrowErrorOnQuery = false;

const collectionsDeleted: string[][] = [];
const itemsDeleted: string[][] = [];
const collectionsUpserted: CollectionRow[][] = [];
const itemsUpserted: ItemRow[][] = [];
const gamificationUpserted: GamificationStateRow[] = [];

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      let mode: 'select' | 'delete' = 'select';
      let inIds: string[] = [];

      interface QueryBuilder {
        select: () => QueryBuilder;
        delete: () => QueryBuilder;
        in: (column: string, values: string[]) => QueryBuilder;
        eq: (column: string, value: string) => QueryBuilder;
        maybeSingle: () => Promise<{
          data: GamificationStateRow | null;
          error: Error | null;
        }>;
        upsert: (rows: unknown) => Promise<{ error: Error | null }>;
        then: <TResult1 = unknown, TResult2 = never>(
          onfulfilled?:
            | ((value: { data: unknown; error: Error | null }) => TResult1)
            | null,
          onrejected?: ((reason: unknown) => TResult2) | null
        ) => Promise<TResult1 | TResult2>;
      }

      const builder: QueryBuilder = {
        select: () => {
          mode = 'select';
          return builder;
        },
        delete: () => {
          mode = 'delete';
          return builder;
        },
        in: (_col: string, values: string[]) => {
          inIds = values;
          return builder;
        },
        eq: () => builder,
        maybeSingle: async () => {
          if (mockThrowErrorOnQuery) {
            return {
              data: null,
              error: new Error('Network error on gamification'),
            };
          }
          return { data: mockDbGamification, error: null };
        },
        upsert: async (rows: unknown) => {
          if (mockThrowErrorOnQuery) {
            return { error: new Error('Network error on upsert') };
          }
          if (table === 'collections') {
            collectionsUpserted.push(rows as CollectionRow[]);
          } else if (table === 'items') {
            itemsUpserted.push(rows as ItemRow[]);
          } else if (table === 'gamification_state') {
            gamificationUpserted.push(rows as GamificationStateRow);
          }
          return { error: null };
        },
        then: (onfulfilled) => {
          if (mockThrowErrorOnQuery) {
            const res = {
              data: null,
              error: new Error('Network error on query'),
            };
            return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as never));
          }
          if (mode === 'delete') {
            if (table === 'collections') collectionsDeleted.push(inIds);
            if (table === 'items') itemsDeleted.push(inIds);
            const res = { data: null, error: null };
            return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as never));
          }
          if (table === 'collections') {
            const res = { data: mockDbCollections, error: null };
            return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as never));
          }
          if (table === 'items') {
            const res = { data: mockDbItems, error: null };
            return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as never));
          }
          const res = { data: null, error: null };
          return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as never));
        },
      };

      return builder;
    },
  },
}));

const sampleUser: User = {
  id: 'user-456',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'collector@hoardex.app',
  phone: '',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('useSyncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThrowErrorOnQuery = false;
    mockDbCollections = [];
    mockDbItems = [];
    mockDbGamification = null;
    collectionsDeleted.length = 0;
    itemsDeleted.length = 0;
    collectionsUpserted.length = 0;
    itemsUpserted.length = 0;
    gamificationUpserted.length = 0;

    useSyncStore.getState().resetSyncState();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    useGamificationStore.getState().resetGamification();
  });

  it('does not trigger sync when user is null (guest / local mode)', async () => {
    const { result } = renderHook(() => useSyncEngine());

    expect(result.current.syncStatus).toBe('local');

    await act(async () => {
      await result.current.syncNow();
    });

    expect(result.current.syncStatus).toBe('local');
    expect(collectionsUpserted).toHaveLength(0);
  });

  it('runs initial bidirectional reconciliation when user logs in', async () => {
    // Datos locales iniciales
    const localCollection: Collection = {
      id: 'col-local-1',
      name: 'Mis Juegos',
      icon: 'Gamepad2',
      accentColor: '#6366f1',
      provider: 'rawg',
      statuses: [
        { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
        { id: 'st-2', label: 'Completado', isCompleted: true, order: 1 },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    useCollectionsStore.setState({ collections: [localCollection] });

    // Datos remotos en Supabase
    const remoteCollectionRow: CollectionRow = {
      id: 'col-remote-2',
      user_id: 'user-456',
      name: 'Mis Libros',
      description: null,
      icon: 'BookOpen',
      accent_color: '#10b981',
      provider: 'openLibrary',
      statuses: [],
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    mockDbCollections = [remoteCollectionRow];

    useSyncStore.getState().setUser(sampleUser);

    const { result } = renderHook(() => useSyncEngine());

    await act(async () => {
      await result.current.syncNow();
    });

    // Debe conciliar ambas colecciones en el store local
    const currentCols = useCollectionsStore.getState().collections;
    expect(currentCols).toHaveLength(2);
    expect(currentCols.map((c) => c.id)).toContain('col-local-1');
    expect(currentCols.map((c) => c.id)).toContain('col-remote-2');

    // Debe haber hecho upsert de las colecciones consolidadas
    expect(collectionsUpserted.length).toBeGreaterThan(0);
    expect(useSyncStore.getState().syncStatus).toBe('synced');
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });

  it('processes pending deletion IDs in Supabase and clears pending queue', async () => {
    useSyncStore.getState().setUser(sampleUser);
    useSyncStore.getState().trackDeletedCollection('col-del-1');
    useSyncStore.getState().trackDeletedItem('it-del-1');

    expect(useSyncStore.getState().pendingDeletionIds.collectionIds).toEqual([
      'col-del-1',
    ]);
    expect(useSyncStore.getState().pendingDeletionIds.itemIds).toEqual([
      'it-del-1',
    ]);

    const { result } = renderHook(() => useSyncEngine());

    await act(async () => {
      await result.current.syncNow();
    });

    expect(collectionsDeleted).toEqual([['col-del-1']]);
    expect(itemsDeleted).toEqual([['it-del-1']]);
    expect(
      useSyncStore.getState().pendingDeletionIds.collectionIds
    ).toHaveLength(0);
    expect(useSyncStore.getState().pendingDeletionIds.itemIds).toHaveLength(0);
  });

  it('debounces mutations (1500 ms) before synchronizing changes', async () => {
    vi.useFakeTimers();

    useSyncStore.getState().setUser(sampleUser);
    const { result } = renderHook(() => useSyncEngine());

    // Dejar que termine el ciclo de reconciliación inicial y el timeout de hidratación (100 ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    collectionsUpserted.length = 0;

    // Mutar una colección en local
    act(() => {
      useCollectionsStore.getState().addCollection({
        id: 'col-new',
        name: 'Figuras',
        icon: 'Sparkles',
        accentColor: '#ec4899',
        provider: 'manual',
        statuses: [],
        createdAt: '2026-01-03T00:00:00Z',
      });
    });

    // Avanzar 1000 ms: aún no debe haberse disparado la sincronización
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(collectionsUpserted).toHaveLength(0);

    // Avanzar 500 ms más (total 1500 ms): debe ejecutarse la subida
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(collectionsUpserted.length).toBeGreaterThan(0);
    expect(result.current.syncStatus).toBe('synced');

    vi.useRealTimers();
  });

  it('re-syncs automatically on window focus event when user is authenticated', async () => {
    useSyncStore.getState().setUser(sampleUser);
    renderHook(() => useSyncEngine());

    await act(async () => {
      await Promise.resolve();
    });
    collectionsUpserted.length = 0;

    // Simular evento focus en window
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(useSyncStore.getState().syncStatus).toBe('synced');
  });

  it('captures errors gracefully and marks syncStatus = error on network failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockThrowErrorOnQuery = true;
    useSyncStore.getState().setUser(sampleUser);

    const { result } = renderHook(() => useSyncEngine());

    await act(async () => {
      await result.current.syncNow();
    });

    expect(result.current.syncStatus).toBe('error');
    // Los datos locales siguen íntegros sin mutaciones corruptas
    expect(useCollectionsStore.getState().collections).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('reconciles gamification state between local and remote', async () => {
    useSyncStore.getState().setUser(sampleUser);

    // Gamificación local: 100 XP, 1 reto cobrado
    useGamificationStore.setState({
      totalXp: 100,
      streak: {
        currentStreak: 2,
        longestStreak: 2,
        lastActivityDate: '2026-01-02',
        isActiveToday: false,
      },
      unlockedAchievements: [
        { achievementId: 'first_item', unlockedAt: '2026-01-01T10:00:00Z' },
      ],
      claimedChallengeIds: ['challenge-local-1'],
      rewardedCollectionIds: [],
      xpHistory: [],
    });

    // Gamificación remota: 150 XP, otro reto cobrado
    mockDbGamification = {
      user_id: 'user-456',
      total_xp: 150,
      streak: {
        currentStreak: 4,
        longestStreak: 5,
        lastActivityDate: '2026-01-03',
        isActiveToday: true,
      },
      unlocked_achievements: [
        { achievementId: 'first_item', unlockedAt: '2026-01-01T12:00:00Z' },
        { achievementId: 'master_collector', unlockedAt: '2026-01-02T10:00:00Z' },
      ],
      claimed_challenge_ids: ['challenge-remote-2'],
      rewarded_collection_ids: ['col-rewarded-1'],
      xp_history: [],
      updated_at: '2026-01-03T00:00:00Z',
    };

    const { result } = renderHook(() => useSyncEngine());

    await act(async () => {
      await result.current.syncNow();
    });

    // Verificar estado consolidado en gamification store local
    const consolidated = useGamificationStore.getState();
    expect(consolidated.totalXp).toBe(150); // Math.max(100, 150)
    expect(consolidated.streak.currentStreak).toBe(4);
    expect(consolidated.claimedChallengeIds).toContain('challenge-local-1');
    expect(consolidated.claimedChallengeIds).toContain('challenge-remote-2');
    expect(consolidated.rewardedCollectionIds).toContain('col-rewarded-1');
    expect(consolidated.unlockedAchievements).toHaveLength(2);

    // Debe haber subido el estado consolidado a Supabase
    expect(gamificationUpserted.length).toBeGreaterThan(0);
    const lastUpsert = gamificationUpserted[gamificationUpserted.length - 1];
    expect(lastUpsert.total_xp).toBe(150);
  });
});
