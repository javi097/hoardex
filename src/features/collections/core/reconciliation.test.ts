import { describe, expect, it } from 'vitest';
import type { CollectionStatus } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import { reconcileOrphanItems } from './reconciliation';

describe('reconcileOrphanItems', () => {
  const collectionId = 'col-games';
  const now = '2026-03-01T15:00:00.000Z';

  const validStatuses: CollectionStatus[] = [
    { id: 'st-backlog', label: 'Pendiente', isCompleted: false, order: 0 },
    { id: 'st-playing', label: 'Jugando', isCompleted: false, order: 1 },
    { id: 'st-finished', label: 'Completado', isCompleted: true, order: 2 },
  ];

  const items: Item[] = [
    {
      id: 'item-valid-1',
      collectionId,
      title: 'Zelda',
      statusId: 'st-backlog',
      xpAwarded: false,
      meta: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'item-orphan-1',
      collectionId,
      title: 'Mario',
      statusId: 'st-deleted-status', // Estado eliminado
      xpAwarded: false,
      meta: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'item-other-collection',
      collectionId: 'col-other',
      title: 'Libro en otra colección',
      statusId: 'st-deleted-status', // Mismo statusId pero en otra colección
      xpAwarded: false,
      meta: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('keeps items with valid statuses untouched', () => {
    const result = reconcileOrphanItems(items, validStatuses, collectionId, now);

    const validItem = result.updatedItems.find((i) => i.id === 'item-valid-1')!;
    expect(validItem.statusId).toBe('st-backlog');
    expect(validItem.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('reassigns orphan items to the first available status sorted by order', () => {
    const result = reconcileOrphanItems(items, validStatuses, collectionId, now);

    expect(result.reassignedCount).toBe(1);
    const orphanItem = result.updatedItems.find(
      (i) => i.id === 'item-orphan-1'
    )!;
    expect(orphanItem.statusId).toBe('st-backlog');
    expect(orphanItem.updatedAt).toBe(now);
  });

  it('does not touch items belonging to other collections', () => {
    const result = reconcileOrphanItems(items, validStatuses, collectionId, now);

    const otherItem = result.updatedItems.find(
      (i) => i.id === 'item-other-collection'
    )!;
    expect(otherItem.statusId).toBe('st-deleted-status');
  });

  it('marks isCompleted and xpAwarded if the fallback status is completed', () => {
    // Escenario donde el único estado disponible es completado
    const singleCompletedStatus: CollectionStatus[] = [
      { id: 'st-only-completed', label: 'Terminado', isCompleted: true, order: 0 },
    ];

    const result = reconcileOrphanItems(
      items,
      singleCompletedStatus,
      collectionId,
      now
    );

    const reassignedItem = result.updatedItems.find(
      (i) => i.id === 'item-orphan-1'
    )!;
    expect(reassignedItem.statusId).toBe('st-only-completed');
    expect(reassignedItem.xpAwarded).toBe(true);
    expect(reassignedItem.completedAt).toBe(now);
  });

  it('throws an error if validStatuses is empty', () => {
    expect(() =>
      reconcileOrphanItems(items, [], collectionId, now)
    ).toThrow('La colección debe tener al menos un estado válido.');
  });
});
