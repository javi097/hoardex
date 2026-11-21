import { beforeEach, describe, expect, it } from 'vitest';
import { useCollectionsStore } from './collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useSyncStore } from '@/features/sync/store/sync.store';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';

describe('useCollectionsStore', () => {
  beforeEach(() => {
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    useSyncStore.getState().resetSyncState();
  });

  const sampleCollection: Collection = {
    id: 'col-1',
    name: 'Videojuegos',
    icon: 'Gamepad2',
    accentColor: '#6366f1',
    provider: 'rawg',
    statuses: [
      { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'st-2', label: 'Completado', isCompleted: true, order: 1 },
    ],
    createdAt: '2026-11-18T12:00:00.000Z',
  };

  it('adds a collection', () => {
    useCollectionsStore.getState().addCollection(sampleCollection);
    expect(useCollectionsStore.getState().collections).toHaveLength(1);
    expect(useCollectionsStore.getState().collections[0]).toEqual(sampleCollection);
  });

  it('updates a collection immutably', () => {
    useCollectionsStore.getState().addCollection(sampleCollection);
    useCollectionsStore
      .getState()
      .updateCollection('col-1', { name: 'Mis Videojuegos Favoritos' });

    const updated = useCollectionsStore.getState().collections[0];
    expect(updated.name).toBe('Mis Videojuegos Favoritos');
    expect(updated.accentColor).toBe('#6366f1');
  });

  it('removes a collection and cascades removal of associated items', () => {
    useCollectionsStore.getState().addCollection(sampleCollection);

    const item1: Item = {
      id: 'it-1',
      collectionId: 'col-1',
      title: 'Zelda',
      statusId: 'st-1',
      xpAwarded: false,
      meta: {},
      createdAt: '2026-11-18T12:00:00.000Z',
      updatedAt: '2026-11-18T12:00:00.000Z',
    };

    const itemOtherCollection: Item = {
      id: 'it-2',
      collectionId: 'col-other',
      title: 'Dune',
      statusId: 'st-other',
      xpAwarded: false,
      meta: {},
      createdAt: '2026-11-18T12:00:00.000Z',
      updatedAt: '2026-11-18T12:00:00.000Z',
    };

    useItemsStore.getState().addItem(item1);
    useItemsStore.getState().addItem(itemOtherCollection);

    expect(useItemsStore.getState().items).toHaveLength(2);

    // Eliminar col-1
    useCollectionsStore.getState().removeCollection('col-1');

    expect(useCollectionsStore.getState().collections).toHaveLength(0);
    // it-1 debe haber sido eliminado, it-2 debe conservarse
    expect(useItemsStore.getState().items).toHaveLength(1);
    expect(useItemsStore.getState().items[0].id).toBe('it-2');

    // Debe registrar el id borrado en pendingDeletionIds
    expect(useSyncStore.getState().pendingDeletionIds.collectionIds).toContain('col-1');
  });

  describe('hydrateCollections', () => {
    it('replaces collections atomically and defensively', () => {
      useCollectionsStore.getState().addCollection(sampleCollection);
      expect(useCollectionsStore.getState().collections).toHaveLength(1);

      const newCollections: Collection[] = [
        {
          id: 'col-remote-1',
          name: 'Libros Leídos',
          icon: 'BookOpen',
          accentColor: '#10b981',
          provider: 'openLibrary',
          statuses: [
            { id: 'st-r1', label: 'Leyendo', isCompleted: false, order: 0 },
            { id: 'st-r2', label: 'Leído', isCompleted: true, order: 1 },
          ],
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
        },
      ];

      useCollectionsStore.getState().hydrateCollections(newCollections);
      expect(useCollectionsStore.getState().collections).toEqual(newCollections);
    });

    it('handles non-array input defensively without throwing', () => {
      useCollectionsStore
        .getState()
        .hydrateCollections(null as unknown as Collection[]);
      expect(useCollectionsStore.getState().collections).toEqual([]);
    });
  });
});
