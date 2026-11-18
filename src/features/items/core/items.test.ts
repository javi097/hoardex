import { describe, expect, it } from 'vitest';
import {
  changeItemStatus,
  createItemManual,
  createItemFromSearchResult,
} from './items';
import type { SearchResult } from '@/interfaces/provider.interface';
import type { Item } from '@/interfaces/item.interface';

describe('items core logic', () => {
  const fixedNow = '2026-11-18T12:00:00.000Z';
  const laterNow = '2026-11-18T15:30:00.000Z';
  const evenLaterNow = '2026-11-18T18:00:00.000Z';

  describe('createItemFromSearchResult', () => {
    it('propagates all search result fields and sets initial item flags', () => {
      const searchResult: SearchResult = {
        externalId: 'rawg-12345',
        title: 'The Legend of Zelda',
        subtitle: 'Nintendo',
        releaseYear: 1986,
        coverUrl: 'https://example.com/zelda.jpg',
        meta: { platform: 'NES', genre: 'Adventure' },
      };

      const item = createItemFromSearchResult({
        collectionId: 'col-1',
        result: searchResult,
        initialStatusId: 'status-pending',
        now: fixedNow,
      });

      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.collectionId).toBe('col-1');
      expect(item.externalId).toBe('rawg-12345');
      expect(item.title).toBe('The Legend of Zelda');
      expect(item.subtitle).toBe('Nintendo');
      expect(item.releaseYear).toBe(1986);
      expect(item.coverUrl).toBe('https://example.com/zelda.jpg');
      expect(item.statusId).toBe('status-pending');
      expect(item.xpAwarded).toBe(false);
      expect(item.completedAt).toBeUndefined();
      expect(item.meta).toEqual({ platform: 'NES', genre: 'Adventure' });
      expect(item.createdAt).toBe(fixedNow);
      expect(item.updatedAt).toBe(fixedNow);
    });
  });

  describe('createItemManual', () => {
    it('creates an item without externalId and with optional coverUrl undefined', () => {
      const item = createItemManual({
        collectionId: 'col-1',
        title: 'Super Mario Bros',
        initialStatusId: 'status-pending',
        now: fixedNow,
      });

      expect(item.id).toBeDefined();
      expect(item.collectionId).toBe('col-1');
      expect(item.externalId).toBeUndefined();
      expect(item.title).toBe('Super Mario Bros');
      expect(item.subtitle).toBeUndefined();
      expect(item.releaseYear).toBeUndefined();
      expect(item.coverUrl).toBeUndefined();
      expect(item.statusId).toBe('status-pending');
      expect(item.xpAwarded).toBe(false);
      expect(item.completedAt).toBeUndefined();
      expect(item.meta).toEqual({});
      expect(item.createdAt).toBe(fixedNow);
      expect(item.updatedAt).toBe(fixedNow);
    });

    it('creates an item with all manual fields provided', () => {
      const item = createItemManual({
        collectionId: 'col-1',
        title: 'Chrono Trigger',
        subtitle: 'Square',
        releaseYear: 1995,
        coverUrl: 'https://example.com/chrono.jpg',
        initialStatusId: 'status-pending',
        meta: { platform: 'SNES' },
        now: fixedNow,
      });

      expect(item.title).toBe('Chrono Trigger');
      expect(item.subtitle).toBe('Square');
      expect(item.releaseYear).toBe(1995);
      expect(item.coverUrl).toBe('https://example.com/chrono.jpg');
      expect(item.meta).toEqual({ platform: 'SNES' });
    });
  });

  describe('changeItemStatus', () => {
    const baseItem: Item = {
      id: 'item-1',
      collectionId: 'col-1',
      title: 'Metroid',
      statusId: 'status-pending',
      xpAwarded: false,
      meta: {},
      createdAt: fixedNow,
      updatedAt: fixedNow,
    };

    it('changing to a non-completed status updates updatedAt without setting xpAwarded or completedAt', () => {
      const updated = changeItemStatus(
        baseItem,
        'status-playing',
        false,
        laterNow
      );

      expect(updated).not.toBe(baseItem); // inmutabilidad
      expect(updated.statusId).toBe('status-playing');
      expect(updated.xpAwarded).toBe(false);
      expect(updated.completedAt).toBeUndefined();
      expect(updated.updatedAt).toBe(laterNow);
      expect(updated.createdAt).toBe(fixedNow);
    });

    it('first completion sets xpAwarded to true and completedAt to current now', () => {
      const completed = changeItemStatus(
        baseItem,
        'status-completed',
        true,
        laterNow
      );

      expect(completed.statusId).toBe('status-completed');
      expect(completed.xpAwarded).toBe(true);
      expect(completed.completedAt).toBe(laterNow);
      expect(completed.updatedAt).toBe(laterNow);
    });

    it('completing a second time preserves initial completedAt and does not duplicate xpAwarded', () => {
      const firstCompleted = changeItemStatus(
        baseItem,
        'status-completed',
        true,
        laterNow
      );

      const secondCompleted = changeItemStatus(
        firstCompleted,
        'status-completed',
        true,
        evenLaterNow
      );

      expect(secondCompleted.xpAwarded).toBe(true);
      expect(secondCompleted.completedAt).toBe(laterNow); // conserva la primera fecha
      expect(secondCompleted.updatedAt).toBe(evenLaterNow); // pero actualiza updatedAt
    });

    it('reopening item (transitioning from completed to non-completed) keeps xpAwarded true and preserves completedAt', () => {
      const completed = changeItemStatus(
        baseItem,
        'status-completed',
        true,
        laterNow
      );

      const reopened = changeItemStatus(
        completed,
        'status-playing',
        false,
        evenLaterNow
      );

      expect(reopened.statusId).toBe('status-playing');
      expect(reopened.xpAwarded).toBe(true); // idempotente: nunca vuelve a false
      expect(reopened.completedAt).toBe(laterNow); // conserva fecha histórica
      expect(reopened.updatedAt).toBe(evenLaterNow);
    });

    it('always updates updatedAt to the passed now on every transition', () => {
      const step1 = changeItemStatus(
        baseItem,
        'status-playing',
        false,
        laterNow
      );
      expect(step1.updatedAt).toBe(laterNow);

      const step2 = changeItemStatus(
        step1,
        'status-completed',
        true,
        evenLaterNow
      );
      expect(step2.updatedAt).toBe(evenLaterNow);
    });
  });
});
