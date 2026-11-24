import { describe, expect, it } from 'vitest';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import type {
  CollectionRow,
  GamificationStateRow,
  ItemRow,
  PersistedGamificationData,
} from '@/interfaces/sync.interface';
import {
  mapCollectionRowToCollection,
  mapCollectionToRow,
  mapItemRowToItem,
  mapItemToRow,
  mapGamificationRowToState,
  mapGamificationStateToRow,
} from './mappers';

describe('mappers', () => {
  describe('Collection mappers', () => {
    const mockCollection: Collection = {
      id: 'col-1',
      name: 'Videojuegos',
      description: 'Mis favoritos',
      icon: 'Gamepad2',
      accentColor: '#6366f1',
      provider: 'rawg',
      statuses: [
        { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
        { id: 'st-2', label: 'Completado', isCompleted: true, order: 1 },
      ],
      isPublic: true,
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-20T12:00:00.000Z',
    };

    const mockCollectionRow: CollectionRow = {
      id: 'col-1',
      user_id: 'user-123',
      name: 'Videojuegos',
      description: 'Mis favoritos',
      icon: 'Gamepad2',
      accent_color: '#6366f1',
      provider: 'rawg',
      statuses: [
        { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
        { id: 'st-2', label: 'Completado', isCompleted: true, order: 1 },
      ],
      is_public: true,
      created_at: '2026-11-20T10:00:00.000Z',
      updated_at: '2026-11-20T12:00:00.000Z',
    };

    it('maps CollectionRow to Collection correctly', () => {
      const result = mapCollectionRowToCollection(mockCollectionRow);
      expect(result).toEqual(mockCollection);
    });

    it('maps Collection to CollectionRow correctly with userId and now', () => {
      const result = mapCollectionToRow(
        mockCollection,
        'user-123',
        '2026-11-20T12:00:00.000Z'
      );
      expect(result).toEqual(mockCollectionRow);
    });

    it('falls back to createdAt when updatedAt is missing in Collection', () => {
      const collectionWithoutUpdatedAt: Collection = {
        ...mockCollection,
        updatedAt: undefined,
      };
      const result = mapCollectionToRow(
        collectionWithoutUpdatedAt,
        'user-123'
      );
      expect(result.updated_at).toBe('2026-11-20T10:00:00.000Z');
    });

    it('handles null description and unknown provider safely', () => {
      const rowWithNulls: CollectionRow = {
        ...mockCollectionRow,
        description: null,
        provider: 'unknown_provider',
      };
      const result = mapCollectionRowToCollection(rowWithNulls);
      expect(result.description).toBeUndefined();
      expect(result.provider).toBe('manual');
    });

    it('preserves isPublic = false in both mapping directions', () => {
      const privateRow: CollectionRow = {
        ...mockCollectionRow,
        is_public: false,
      };
      const mappedCol = mapCollectionRowToCollection(privateRow);
      expect(mappedCol.isPublic).toBe(false);

      const mappedRow = mapCollectionToRow(mappedCol, 'user-123');
      expect(mappedRow.is_public).toBe(false);
    });

    it('defaults isPublic to true when is_public is missing in CollectionRow', () => {
      const rowWithoutIsPublic: CollectionRow = {
        ...mockCollectionRow,
        is_public: undefined,
      };
      const mappedCol = mapCollectionRowToCollection(rowWithoutIsPublic);
      expect(mappedCol.isPublic).toBe(true);
    });
  });

  describe('Item mappers', () => {
    const mockItem: Item = {
      id: 'it-1',
      collectionId: 'col-1',
      title: 'Chrono Trigger',
      subtitle: 'SNES Classic',
      releaseYear: 1995,
      coverUrl: 'https://example.com/cover.jpg',
      statusId: 'st-2',
      rating: 5,
      notes: 'Obra maestra atemporal.',
      meta: { platform: 'SNES', edition: 'Cartridge' },
      xpAwarded: true,
      reviewXpAwarded: true,
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-20T13:00:00.000Z',
    };

    const mockItemRow: ItemRow = {
      id: 'it-1',
      user_id: 'user-123',
      collection_id: 'col-1',
      title: 'Chrono Trigger',
      subtitle: 'SNES Classic',
      release_year: 1995,
      cover_url: 'https://example.com/cover.jpg',
      status_id: 'st-2',
      rating: 5,
      notes: 'Obra maestra atemporal.',
      meta: { platform: 'SNES', edition: 'Cartridge' },
      xp_awarded: true,
      review_xp_awarded: true,
      created_at: '2026-11-20T10:00:00.000Z',
      updated_at: '2026-11-20T13:00:00.000Z',
    };

    it('maps ItemRow to Item cleanly converting nulls to undefined', () => {
      const result = mapItemRowToItem(mockItemRow);
      expect(result).toEqual(mockItem);
    });

    it('maps Item to ItemRow cleanly converting undefined to nulls', () => {
      const result = mapItemToRow(
        mockItem,
        'user-123',
        '2026-11-20T13:00:00.000Z'
      );
      expect(result).toEqual(mockItemRow);
    });

    it('handles minimal item with null optional fields', () => {
      const minimalRow: ItemRow = {
        id: 'it-min',
        user_id: 'u-1',
        collection_id: 'c-1',
        title: 'Minimal Item',
        subtitle: null,
        release_year: null,
        cover_url: null,
        status_id: 's-1',
        rating: null,
        notes: null,
        meta: {},
        xp_awarded: false,
        review_xp_awarded: false,
        created_at: '2026-11-20T10:00:00.000Z',
        updated_at: '2026-11-20T10:00:00.000Z',
      };

      const item = mapItemRowToItem(minimalRow);
      expect(item.subtitle).toBeUndefined();
      expect(item.releaseYear).toBeUndefined();
      expect(item.coverUrl).toBeUndefined();
      expect(item.rating).toBeUndefined();
      expect(item.notes).toBeUndefined();

      const backToRow = mapItemToRow(item, 'u-1');
      expect(backToRow.subtitle).toBeNull();
      expect(backToRow.release_year).toBeNull();
      expect(backToRow.cover_url).toBeNull();
      expect(backToRow.rating).toBeNull();
      expect(backToRow.notes).toBeNull();
    });
  });

  describe('Gamification mappers', () => {
    const mockGamificationData: PersistedGamificationData = {
      totalXp: 180,
      streak: {
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: '2026-11-21',
        isActiveToday: true,
      },
      unlockedAchievements: [
        { achievementId: 'first_item', unlockedAt: '2026-11-20T10:00:00.000Z' },
      ],
      claimedChallengeIds: ['weekly_add_items_2026-W47'],
      rewardedCollectionIds: ['col-1'],
      xpHistory: [
        {
          id: 'ev-1',
          action: 'add_item',
          xpGained: 10,
          description: 'Añadido Chrono Trigger',
          timestamp: '2026-11-20T10:00:00.000Z',
        },
      ],
    };

    const mockGamificationRow: GamificationStateRow = {
      user_id: 'user-123',
      total_xp: 180,
      streak: {
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: '2026-11-21',
        isActiveToday: true,
      },
      unlocked_achievements: [
        { achievementId: 'first_item', unlockedAt: '2026-11-20T10:00:00.000Z' },
      ],
      claimed_challenge_ids: ['weekly_add_items_2026-W47'],
      rewarded_collection_ids: ['col-1'],
      xp_history: [
        {
          id: 'ev-1',
          action: 'add_item',
          xpGained: 10,
          description: 'Añadido Chrono Trigger',
          timestamp: '2026-11-20T10:00:00.000Z',
        },
      ],
      updated_at: '2026-11-21T12:00:00.000Z',
    };

    it('maps GamificationStateRow to PersistedGamificationData cleanly', () => {
      const state = mapGamificationRowToState(mockGamificationRow);
      expect(state).toEqual(mockGamificationData);
    });

    it('maps PersistedGamificationData to GamificationStateRow cleanly capping history to 50', () => {
      const row = mapGamificationStateToRow(
        mockGamificationData,
        'user-123',
        '2026-11-21T12:00:00.000Z'
      );
      expect(row).toEqual(mockGamificationRow);
    });
  });
});
