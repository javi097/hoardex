import { beforeEach, describe, expect, it } from 'vitest';
import { useItemsStore } from './items.store';
import { useSyncStore } from '@/features/sync/store/sync.store';
import type { Item } from '@/interfaces/item.interface';

describe('useItemsStore', () => {
  beforeEach(() => {
    useItemsStore.setState({ items: [] });
    useSyncStore.getState().resetSyncState();
  });

  const sampleItem: Item = {
    id: 'it-1',
    collectionId: 'col-1',
    title: 'Super Mario World',
    statusId: 'st-pending',
    xpAwarded: false,
    meta: {},
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
  };

  it('adds an item', () => {
    useItemsStore.getState().addItem(sampleItem);
    expect(useItemsStore.getState().items).toHaveLength(1);
    expect(useItemsStore.getState().items[0]).toEqual(sampleItem);
  });

  it('removes an item by id and tracks deleted id in sync store', () => {
    useItemsStore.getState().addItem(sampleItem);
    useItemsStore.getState().removeItem('it-1');
    expect(useItemsStore.getState().items).toHaveLength(0);
    expect(useSyncStore.getState().pendingDeletionIds.itemIds).toContain('it-1');
  });

  it('removes multiple items by collectionId and tracks all deleted ids', () => {
    const item2: Item = {
      ...sampleItem,
      id: 'it-2',
    };
    const itemOther: Item = {
      ...sampleItem,
      id: 'it-3',
      collectionId: 'col-2',
    };

    useItemsStore.getState().addItem(sampleItem);
    useItemsStore.getState().addItem(item2);
    useItemsStore.getState().addItem(itemOther);

    expect(useItemsStore.getState().items).toHaveLength(3);

    useItemsStore.getState().removeItemsByCollection('col-1');

    expect(useItemsStore.getState().items).toHaveLength(1);
    expect(useItemsStore.getState().items[0].id).toBe('it-3');
    expect(useSyncStore.getState().pendingDeletionIds.itemIds).toEqual(
      expect.arrayContaining(['it-1', 'it-2'])
    );
  });

  it('updates item status delegating to changeItemStatus with idempotency', () => {
    useItemsStore.getState().addItem(sampleItem);

    // 1er cambio: completar
    const completedNow = '2026-11-18T14:00:00.000Z';
    useItemsStore
      .getState()
      .updateItemStatus('it-1', 'st-completed', true, completedNow);

    let current = useItemsStore.getState().items[0];
    expect(current.statusId).toBe('st-completed');
    expect(current.xpAwarded).toBe(true);
    expect(current.completedAt).toBe(completedNow);
    expect(current.updatedAt).toBe(completedNow);

    // 2do cambio: reabrir
    const reopenedNow = '2026-11-18T16:00:00.000Z';
    useItemsStore
      .getState()
      .updateItemStatus('it-1', 'st-pending', false, reopenedNow);

    current = useItemsStore.getState().items[0];
    expect(current.statusId).toBe('st-pending');
    expect(current.xpAwarded).toBe(true); // se mantiene
    expect(current.completedAt).toBe(completedNow); // se mantiene
    expect(current.updatedAt).toBe(reopenedNow);
  });

  it('updates item details (rating, notes) and refreshes updatedAt', () => {
    useItemsStore.getState().addItem(sampleItem);

    const now = '2026-11-20T10:00:00.000Z';
    useItemsStore.getState().updateItem(
      'it-1',
      {
        rating: 5,
        notes: 'Clásico absoluto de plataformas.',
      },
      now
    );

    let current = useItemsStore.getState().items[0];
    expect(current.rating).toBe(5);
    expect(current.notes).toBe('Clásico absoluto de plataformas.');
    expect(current.updatedAt).toBe(now);

    // Desmarcar rating a undefined
    const now2 = '2026-11-20T11:00:00.000Z';
    useItemsStore.getState().updateItem(
      'it-1',
      {
        rating: undefined,
      },
      now2
    );

    current = useItemsStore.getState().items[0];
    expect(current.rating).toBeUndefined();
    expect(current.notes).toBe('Clásico absoluto de plataformas.');
    expect(current.updatedAt).toBe(now2);
  });

  it('reassigns items status in batch preserving XP idempotence', () => {
    const itemA: Item = { ...sampleItem, id: 'it-a', statusId: 'st-old' };
    const itemB: Item = { ...sampleItem, id: 'it-b', statusId: 'st-old' };
    const itemC: Item = { ...sampleItem, id: 'it-c', statusId: 'st-untouched' };

    useItemsStore.getState().addItem(itemA);
    useItemsStore.getState().addItem(itemB);
    useItemsStore.getState().addItem(itemC);

    const now = '2026-11-20T12:00:00.000Z';
    useItemsStore
      .getState()
      .reassignItemsStatus(['it-a', 'it-b'], 'st-new', true, now);

    const items = useItemsStore.getState().items;
    const updatedA = items.find((i) => i.id === 'it-a')!;
    const updatedB = items.find((i) => i.id === 'it-b')!;
    const untouchedC = items.find((i) => i.id === 'it-c')!;

    expect(updatedA.statusId).toBe('st-new');
    expect(updatedA.xpAwarded).toBe(true);
    expect(updatedA.completedAt).toBe(now);
    expect(updatedA.updatedAt).toBe(now);

    expect(updatedB.statusId).toBe('st-new');
    expect(updatedB.xpAwarded).toBe(true);

    expect(untouchedC.statusId).toBe('st-untouched');
  });

  describe('hydrateItems', () => {
    it('replaces items atomically and defensively', () => {
      useItemsStore.getState().addItem(sampleItem);
      expect(useItemsStore.getState().items).toHaveLength(1);

      const remoteItems: Item[] = [
        {
          id: 'it-remote-1',
          collectionId: 'col-1',
          title: 'Metroid Prime',
          statusId: 'st-completed',
          xpAwarded: true,
          meta: {},
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
        },
      ];

      useItemsStore.getState().hydrateItems(remoteItems);
      expect(useItemsStore.getState().items).toEqual(remoteItems);
    });

    it('handles non-array input defensively without throwing', () => {
      useItemsStore.getState().hydrateItems(null as unknown as Item[]);
      expect(useItemsStore.getState().items).toEqual([]);
    });
  });
});
