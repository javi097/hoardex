import { describe, expect, it } from 'vitest';
import type { Item } from '@/interfaces/item.interface';
import {
  ITEM_SORT_OPTIONS,
  filterAndSortItems,
  normalizeText,
  updateItemDetails,
} from './sorting';

describe('normalizeText', () => {
  it('lowercases and removes accents and diacritics', () => {
    expect(normalizeText('Pokémon')).toBe('pokemon');
    expect(normalizeText('  Cien Años de Soledad  ')).toBe(
      'cien anos de soledad'
    );
    expect(normalizeText('ÁÉÍÓÚüñ')).toBe('aeiouun');
  });
});

describe('filterAndSortItems', () => {
  const baseItems: Item[] = [
    {
      id: 'item-1',
      collectionId: 'col-1',
      title: 'Pokémon Rojo Fuego',
      subtitle: 'Game Boy Advance',
      releaseYear: 2004,
      statusId: 'st-completed',
      xpAwarded: true,
      rating: 5,
      notes: 'Mi infancia entera.',
      meta: {},
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'item-2',
      collectionId: 'col-1',
      title: 'The Legend of Zelda: Breath of the Wild',
      subtitle: 'Nintendo Switch',
      releaseYear: 2017,
      statusId: 'st-in-progress',
      xpAwarded: false,
      rating: 4,
      meta: {},
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
    {
      id: 'item-3',
      collectionId: 'col-1',
      title: 'Chrono Trigger',
      subtitle: 'Super Nintendo',
      releaseYear: 1995,
      statusId: 'st-pending',
      xpAwarded: false,
      rating: undefined,
      meta: {},
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    },
    {
      id: 'item-4',
      collectionId: 'col-1',
      title: 'Prototipo Indie Desconocido',
      subtitle: 'PC Steam',
      releaseYear: undefined,
      statusId: 'st-pending',
      xpAwarded: false,
      rating: undefined,
      meta: {},
      createdAt: '2026-01-04T10:00:00.000Z',
      updatedAt: '2026-01-04T10:00:00.000Z',
    },
  ];

  it('filters by query matching title insensitively with diacritics', () => {
    const defaultSort = ITEM_SORT_OPTIONS[0]; // createdAt desc
    const result = filterAndSortItems(
      baseItems,
      { query: 'pokemon', statusId: 'all' },
      defaultSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-1');
  });

  it('filters by query matching subtitle/author', () => {
    const defaultSort = ITEM_SORT_OPTIONS[0];
    const result = filterAndSortItems(
      baseItems,
      { query: 'Nintendo Switch', statusId: 'all' },
      defaultSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-2');
  });

  it('filters by specific statusId', () => {
    const defaultSort = ITEM_SORT_OPTIONS[0];
    const result = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'st-pending' },
      defaultSort
    );
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(['item-4', 'item-3']);
  });

  it('combines query and statusId filters', () => {
    const defaultSort = ITEM_SORT_OPTIONS[0];
    const result = filterAndSortItems(
      baseItems,
      { query: 'Chrono', statusId: 'st-pending' },
      defaultSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-3');
  });

  it('returns empty array when no item matches', () => {
    const defaultSort = ITEM_SORT_OPTIONS[0];
    const result = filterAndSortItems(
      baseItems,
      { query: 'Inexistente', statusId: 'all' },
      defaultSort
    );
    expect(result).toHaveLength(0);
  });

  it('sorts by createdAt desc and asc', () => {
    const sortDesc = ITEM_SORT_OPTIONS.find((s) => s.id === 'createdAt-desc')!;
    const resultDesc = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortDesc
    );
    expect(resultDesc.map((i) => i.id)).toEqual([
      'item-4',
      'item-3',
      'item-2',
      'item-1',
    ]);

    const sortAsc = ITEM_SORT_OPTIONS.find((s) => s.id === 'createdAt-asc')!;
    const resultAsc = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortAsc
    );
    expect(resultAsc.map((i) => i.id)).toEqual([
      'item-1',
      'item-2',
      'item-3',
      'item-4',
    ]);
  });

  it('sorts by title A-Z and Z-A', () => {
    const sortTitleAsc = ITEM_SORT_OPTIONS.find((s) => s.id === 'title-asc')!;
    const resultAsc = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortTitleAsc
    );
    expect(resultAsc.map((i) => i.title)).toEqual([
      'Chrono Trigger',
      'Pokémon Rojo Fuego',
      'Prototipo Indie Desconocido',
      'The Legend of Zelda: Breath of the Wild',
    ]);

    const sortTitleDesc = ITEM_SORT_OPTIONS.find((s) => s.id === 'title-desc')!;
    const resultDesc = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortTitleDesc
    );
    expect(resultDesc.map((i) => i.title)).toEqual([
      'The Legend of Zelda: Breath of the Wild',
      'Prototipo Indie Desconocido',
      'Pokémon Rojo Fuego',
      'Chrono Trigger',
    ]);
  });

  it('sorts by releaseYear placing items without year at the end', () => {
    const sortYearDesc = ITEM_SORT_OPTIONS.find(
      (s) => s.id === 'releaseYear-desc'
    )!;
    const resultDesc = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortYearDesc
    );
    // 2017, 2004, 1995, undefined al final
    expect(resultDesc.map((i) => i.id)).toEqual([
      'item-2',
      'item-1',
      'item-3',
      'item-4',
    ]);

    const sortYearAsc = ITEM_SORT_OPTIONS.find(
      (s) => s.id === 'releaseYear-asc'
    )!;
    const resultAsc = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortYearAsc
    );
    // 1995, 2004, 2017, undefined al final
    expect(resultAsc.map((i) => i.id)).toEqual([
      'item-3',
      'item-1',
      'item-2',
      'item-4',
    ]);
  });

  it('sorts by rating placing unrated items at the end', () => {
    const sortRatingDesc = ITEM_SORT_OPTIONS.find(
      (s) => s.id === 'rating-desc'
    )!;
    const result = filterAndSortItems(
      baseItems,
      { query: '', statusId: 'all' },
      sortRatingDesc
    );
    // 5 estrellas, 4 estrellas, y los no valorados al final
    expect(result[0].id).toBe('item-1');
    expect(result[1].id).toBe('item-2');
    expect(result[2].rating).toBeUndefined();
    expect(result[3].rating).toBeUndefined();
  });

  it('is completely immutable and does not alter the original array', () => {
    const originalSnapshot = JSON.stringify(baseItems);
    filterAndSortItems(
      baseItems,
      { query: 'test', statusId: 'all' },
      ITEM_SORT_OPTIONS[2]
    );
    expect(JSON.stringify(baseItems)).toBe(originalSnapshot);
  });
});

describe('updateItemDetails', () => {
  const item: Item = {
    id: 'item-10',
    collectionId: 'col-1',
    title: 'Final Fantasy VII',
    statusId: 'st-1',
    xpAwarded: false,
    meta: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('updates item fields and refreshes updatedAt to now', () => {
    const now = '2026-02-01T12:00:00.000Z';
    const updated = updateItemDetails(
      item,
      {
        rating: 5,
        notes: 'Obra maestra del JRPG.',
        subtitle: 'Square Enix',
      },
      now
    );

    expect(updated.id).toBe('item-10');
    expect(updated.rating).toBe(5);
    expect(updated.notes).toBe('Obra maestra del JRPG.');
    expect(updated.subtitle).toBe('Square Enix');
    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe(now);
  });
});
