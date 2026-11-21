import { describe, expect, it } from 'vitest';
import { calculateCollectorStats } from './stats';

describe('calculateCollectorStats', () => {
  it('returns clean zeroed statistics for an empty catalog without NaN or division by zero', () => {
    const stats = calculateCollectorStats([], []);

    expect(stats.totalItems).toBe(0);
    expect(stats.completedItems).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(Number.isNaN(stats.completionRate)).toBe(false);

    expect(stats.ratedItemsCount).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(Number.isNaN(stats.averageRating)).toBe(false);

    expect(stats.reviewedItemsCount).toBe(0);
    expect(stats.totalCollections).toBe(0);
    expect(stats.mostActiveCollection).toBeNull();
  });

  it('returns mostActiveCollection as null when collections exist but have 0 items', () => {
    const collections = [
      { id: 'c1', name: 'Libros' },
      { id: 'c2', name: 'Videojuegos' },
    ];
    const stats = calculateCollectorStats(collections, []);

    expect(stats.totalCollections).toBe(2);
    expect(stats.totalItems).toBe(0);
    expect(stats.mostActiveCollection).toBeNull();
  });

  it('calculates completion rate and items count accurately', () => {
    const collections = [{ id: 'c1', name: 'Manga' }];
    const items = [
      { collectionId: 'c1', xpAwarded: true },
      { collectionId: 'c1', xpAwarded: true },
      { collectionId: 'c1', xpAwarded: false },
    ]; // 2 de 3 completados = 66.66% -> 67%

    const stats = calculateCollectorStats(collections, items);

    expect(stats.totalItems).toBe(3);
    expect(stats.completedItems).toBe(2);
    expect(stats.completionRate).toBe(67);
  });

  it('calculates average rating rounded to 1 decimal place ignoring unrated items', () => {
    const collections = [{ id: 'c1', name: 'Películas' }];
    const items = [
      { collectionId: 'c1', rating: 5 },
      { collectionId: 'c1', rating: 4 },
      { collectionId: 'c1', rating: 4 }, // (5 + 4 + 4) / 3 = 4.333... -> 4.3
      { collectionId: 'c1', rating: undefined },
      { collectionId: 'c1', rating: 0 }, // 0 no computa como calificado
    ];

    const stats = calculateCollectorStats(collections, items);

    expect(stats.ratedItemsCount).toBe(3);
    expect(stats.averageRating).toBe(4.3);
  });

  it('counts reviewed items strictly ignoring empty or whitespace-only notes', () => {
    const collections = [{ id: 'c1', name: 'Discos' }];
    const items = [
      { collectionId: 'c1', notes: 'Gran álbum de rock progresivo' },
      { collectionId: 'c1', notes: '    ' }, // Solo espacios -> no cuenta
      { collectionId: 'c1', notes: '' }, // Cadena vacía -> no cuenta
      { collectionId: 'c1', notes: undefined }, // No cuenta
      { collectionId: 'c1', notes: 'Recomendado' },
    ];

    const stats = calculateCollectorStats(collections, items);

    expect(stats.reviewedItemsCount).toBe(2);
  });

  it('determines the most active collection and resolves ties deterministically by list order', () => {
    const collections = [
      { id: 'c1', name: 'Colección Alfa' },
      { id: 'c2', name: 'Colección Beta' },
      { id: 'c3', name: 'Colección Gamma' },
    ];

    // Alfa y Beta empatadas con 2 ítems, Gamma con 1 ítem
    const tiedItems = [
      { collectionId: 'c1', xpAwarded: true },
      { collectionId: 'c1', xpAwarded: false },
      { collectionId: 'c2', xpAwarded: true },
      { collectionId: 'c2', xpAwarded: true },
      { collectionId: 'c3', xpAwarded: false },
    ];

    const statsTied = calculateCollectorStats(collections, tiedItems);
    // Debe seleccionar Alfa (primera en orden de lista)
    expect(statsTied.mostActiveCollection).toEqual({
      name: 'Colección Alfa',
      itemCount: 2,
      completedCount: 1,
    });

    // Si Beta tiene más ítems, Beta debe ganar
    const betaWinsItems = [
      ...tiedItems,
      { collectionId: 'c2', xpAwarded: false },
    ];
    const statsBetaWins = calculateCollectorStats(collections, betaWinsItems);
    expect(statsBetaWins.mostActiveCollection).toEqual({
      name: 'Colección Beta',
      itemCount: 3,
      completedCount: 2,
    });
  });
});
