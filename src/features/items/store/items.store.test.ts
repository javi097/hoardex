import { beforeEach, describe, expect, it } from 'vitest';
import { useItemsStore } from './items.store';
import type { Item } from '@/interfaces/item.interface';

describe('useItemsStore', () => {
  beforeEach(() => {
    useItemsStore.setState({ items: [] });
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

  it('removes an item by id', () => {
    useItemsStore.getState().addItem(sampleItem);
    useItemsStore.getState().removeItem('it-1');
    expect(useItemsStore.getState().items).toHaveLength(0);
  });

  it('removes multiple items by collectionId', () => {
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
});
