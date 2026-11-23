import { describe, it, expect } from 'vitest';
import { calculateWrappedStats } from './wrapped';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';

describe('calculateWrappedStats', () => {
  const mockCollections: Collection[] = [
    {
      id: 'col-games',
      name: 'Videojuegos',
      icon: 'Gamepad2',
      accentColor: '#6366f1',
      provider: 'rawg',
      createdAt: '2025-01-01T00:00:00Z',
      statuses: [
        { id: 'st-pending', label: 'Pendiente', isCompleted: false, order: 1 },
        { id: 'st-playing', label: 'Jugando', isCompleted: false, order: 2 },
        { id: 'st-completed', label: 'Terminado', isCompleted: true, order: 3 },
      ],
    },
    {
      id: 'col-books',
      name: 'Libros',
      icon: 'Book',
      accentColor: '#10b981',
      provider: 'openLibrary',
      createdAt: '2025-01-02T00:00:00Z',
      statuses: [
        { id: 'st-unread', label: 'Por leer', isCompleted: false, order: 1 },
        { id: 'st-read', label: 'Leído', isCompleted: true, order: 2 },
      ],
    },
  ];

  const mockGamification = {
    totalXp: 350,
    streak: {
      currentStreak: 5,
      longestStreak: 12,
      lastActivityDate: '2026-11-20',
      isActiveToday: true,
    },
  };

  it('devuelve valores seguros a cero y hasActivity false cuando no hay actividad en el año', () => {
    const stats = calculateWrappedStats(mockCollections, [], mockGamification, 2026);

    expect(stats).toEqual({
      year: 2026,
      hasActivity: false,
      totalAdded: 0,
      totalCompleted: 0,
      completionRate: 0,
      averageRating: null,
      favoriteCollection: null,
      collectionsBreakdown: [],
      topRatedItems: [],
      longestStreak: 12,
      level: 3,
      levelTitle: 'Catalogador Curioso',
      totalXp: 350,
    });
  });

  it('ignora ítems creados o actualizados en otros años', () => {
    const items: Item[] = [
      {
        id: 'item-old',
        collectionId: 'col-games',
        title: 'Retro Game',
        statusId: 'st-completed',
        xpAwarded: true,
        rating: 5,
        meta: {},
        createdAt: '2025-05-10T12:00:00Z',
        updatedAt: '2025-05-10T12:00:00Z',
      },
    ];

    const stats = calculateWrappedStats(mockCollections, items, mockGamification, 2026);
    expect(stats.hasActivity).toBe(false);
    expect(stats.totalAdded).toBe(0);
    expect(stats.totalCompleted).toBe(0);
    expect(stats.averageRating).toBeNull();
  });

  it('computa altas y completados en el año objetivo calculando la tasa de completitud', () => {
    const items: Item[] = [
      {
        id: 'item-1',
        collectionId: 'col-games',
        title: 'Juego 1',
        statusId: 'st-completed',
        xpAwarded: true,
        rating: 5,
        meta: {},
        createdAt: '2026-02-01T10:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
      },
      {
        id: 'item-2',
        collectionId: 'col-games',
        title: 'Juego 2',
        statusId: 'st-playing',
        xpAwarded: true,
        rating: 4,
        meta: {},
        createdAt: '2026-04-01T10:00:00Z',
        updatedAt: '2026-04-01T10:00:00Z',
      },
      {
        id: 'item-3',
        collectionId: 'col-games',
        title: 'Juego 3',
        statusId: 'st-pending',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-05-01T10:00:00Z',
        updatedAt: '2026-05-01T10:00:00Z',
      },
      {
        id: 'item-4',
        collectionId: 'col-books',
        title: 'Libro 1',
        statusId: 'st-read',
        xpAwarded: true,
        rating: 4,
        meta: {},
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-15T10:00:00Z',
      },
    ];

    const stats = calculateWrappedStats(mockCollections, items, mockGamification, 2026);

    expect(stats.hasActivity).toBe(true);
    expect(stats.totalAdded).toBe(4);
    expect(stats.totalCompleted).toBe(2); // item-1 y item-4
    expect(stats.completionRate).toBe(50); // 2 de 4 = 50%
  });

  it('computa ítems completados en el año aunque hayan sido añadidos en años anteriores', () => {
    const items: Item[] = [
      {
        id: 'item-backlog',
        collectionId: 'col-games',
        title: 'Juego del Backlog',
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2026-01-10T15:00:00Z',
      },
    ];

    const stats = calculateWrappedStats(mockCollections, items, mockGamification, 2026);

    expect(stats.hasActivity).toBe(true);
    expect(stats.totalAdded).toBe(0);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.completionRate).toBe(100);
  });

  it('calcula la valoración media redondeando a un decimal y excluye ítems sin puntuación', () => {
    const items: Item[] = [
      {
        id: 'it-1',
        collectionId: 'col-games',
        title: 'Item A',
        statusId: 'st-completed',
        rating: 5,
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'it-2',
        collectionId: 'col-games',
        title: 'Item B',
        statusId: 'st-completed',
        rating: 4,
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: 'it-3',
        collectionId: 'col-games',
        title: 'Item C',
        statusId: 'st-completed',
        rating: 4,
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-03T00:00:00Z',
        updatedAt: '2026-01-03T00:00:00Z',
      },
      {
        id: 'it-4',
        collectionId: 'col-games',
        title: 'Item D',
        statusId: 'st-pending',
        xpAwarded: true,
        // Sin rating
        meta: {},
        createdAt: '2026-01-04T00:00:00Z',
        updatedAt: '2026-01-04T00:00:00Z',
      },
    ];

    // (5 + 4 + 4) / 3 = 13 / 3 = 4.3333... -> 4.3
    const stats = calculateWrappedStats(mockCollections, items, mockGamification, 2026);
    expect(stats.averageRating).toBe(4.3);
  });

  it('determina la colección reina y su desglose ordenado con porcentajes', () => {
    const items: Item[] = [
      {
        id: 'it-1',
        collectionId: 'col-games',
        title: 'Juego A',
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'it-2',
        collectionId: 'col-games',
        title: 'Juego B',
        statusId: 'st-playing',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: 'it-3',
        collectionId: 'col-books',
        title: 'Libro A',
        statusId: 'st-read',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-03T00:00:00Z',
        updatedAt: '2026-01-03T00:00:00Z',
      },
    ];

    const stats = calculateWrappedStats(mockCollections, items, mockGamification, 2026);

    expect(stats.favoriteCollection?.collectionId).toBe('col-games');
    expect(stats.favoriteCollection?.collectionName).toBe('Videojuegos');
    expect(stats.collectionsBreakdown).toHaveLength(2);
    expect(stats.collectionsBreakdown[0].collectionId).toBe('col-games');
    expect(stats.collectionsBreakdown[0].itemsCount).toBe(2);
    expect(stats.collectionsBreakdown[0].percentage).toBe(67);
    expect(stats.collectionsBreakdown[1].collectionId).toBe('col-books');
    expect(stats.collectionsBreakdown[1].itemsCount).toBe(1);
    expect(stats.collectionsBreakdown[1].percentage).toBe(33);
  });

  it('ordena y limita el top 5 de ítems mejor puntuados', () => {
    const items: Item[] = [
      {
        id: 'it-1',
        collectionId: 'col-games',
        title: 'Juego 1',
        rating: 3,
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'it-2',
        collectionId: 'col-games',
        title: 'Juego 2',
        rating: 5,
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: 'it-3',
        collectionId: 'col-games',
        title: 'Juego 3',
        rating: 4,
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-03T00:00:00Z',
        updatedAt: '2026-01-03T00:00:00Z',
      },
      {
        id: 'it-4',
        collectionId: 'col-games',
        title: 'Juego 4',
        rating: 5,
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-04T00:00:00Z',
        updatedAt: '2026-01-04T00:00:00Z',
      },
      {
        id: 'it-5',
        collectionId: 'col-games',
        title: 'Juego 5',
        rating: 2,
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-05T00:00:00Z',
        updatedAt: '2026-01-05T00:00:00Z',
      },
      {
        id: 'it-6',
        collectionId: 'col-games',
        title: 'Juego 6',
        rating: 1,
        statusId: 'st-completed',
        xpAwarded: true,
        meta: {},
        createdAt: '2026-01-06T00:00:00Z',
        updatedAt: '2026-01-06T00:00:00Z',
      },
    ];

    const stats = calculateWrappedStats(mockCollections, items, mockGamification, 2026);

    expect(stats.topRatedItems).toHaveLength(5);
    // Deben estar ordenados descendentemente: rating 5 (juego 4, juego 2), rating 4, rating 3, rating 2
    expect(stats.topRatedItems[0].rating).toBe(5);
    expect(stats.topRatedItems[1].rating).toBe(5);
    expect(stats.topRatedItems[2].rating).toBe(4);
    expect(stats.topRatedItems[3].rating).toBe(3);
    expect(stats.topRatedItems[4].rating).toBe(2);
    // El de rating 1 ('Juego 6') queda fuera del top 5
    expect(stats.topRatedItems.some((it) => it.id === 'it-6')).toBe(false);
  });
});
