import { describe, expect, it } from 'vitest';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import type {
  HoardexBackup,
  PersistedGamificationData,
} from '@/interfaces/sync.interface';
import { generateBackup, validateBackup } from './backup';

describe('backup', () => {
  const mockCollections: Collection[] = [
    {
      id: 'col-1',
      name: 'Libros',
      icon: 'Book',
      accentColor: '#3b82f6',
      provider: 'openLibrary',
      statuses: [
        { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
      ],
      createdAt: '2026-11-20T10:00:00.000Z',
    },
  ];

  const mockItems: Item[] = [
    {
      id: 'it-1',
      collectionId: 'col-1',
      title: 'Dune',
      statusId: 'st-1',
      xpAwarded: false,
      meta: {},
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-20T10:00:00.000Z',
    },
  ];

  const mockGamification: PersistedGamificationData = {
    totalXp: 50,
    streak: {
      currentStreak: 1,
      longestStreak: 2,
      lastActivityDate: '2026-11-21',
      isActiveToday: true,
    },
    unlockedAchievements: [],
    claimedChallengeIds: [],
    rewardedCollectionIds: [],
    xpHistory: [],
  };

  describe('generateBackup', () => {
    it('generates a valid HoardexBackup with version 1 and given payload', () => {
      const backup = generateBackup(
        mockCollections,
        mockItems,
        mockGamification,
        '2026-11-21T16:00:00.000Z'
      );

      expect(backup.version).toBe(1);
      expect(backup.exportedAt).toBe('2026-11-21T16:00:00.000Z');
      expect(backup.collections).toEqual(mockCollections);
      expect(backup.items).toEqual(mockItems);
      expect(backup.gamification).toEqual(mockGamification);
    });
  });

  describe('validateBackup', () => {
    it('accepts a legitimate backup successfully', () => {
      const valid: HoardexBackup = {
        version: 1,
        exportedAt: '2026-11-21T16:00:00.000Z',
        collections: mockCollections,
        items: mockItems,
        gamification: mockGamification,
      };

      const result = validateBackup(valid);
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.backup.version).toBe(1);
        expect(result.backup.collections).toHaveLength(1);
      }
    });

    it('rejects primitives, null or arrays as root', () => {
      expect(validateBackup(null).isValid).toBe(false);
      expect(validateBackup('string').isValid).toBe(false);
      expect(validateBackup([]).isValid).toBe(false);
      expect(validateBackup(123).isValid).toBe(false);
    });

    it('rejects incompatible or missing version', () => {
      const wrongVersion = {
        version: 2,
        exportedAt: '2026-11-21',
        collections: [],
        items: [],
        gamification: mockGamification,
      };
      const res = validateBackup(wrongVersion);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Versión de copia de seguridad no soportada');
      }

      const noVersion = {
        exportedAt: '2026-11-21',
        collections: [],
        items: [],
        gamification: mockGamification,
      };
      expect(validateBackup(noVersion).isValid).toBe(false);
    });

    it('rejects missing or empty exportedAt', () => {
      const bad = {
        version: 1,
        exportedAt: '',
        collections: [],
        items: [],
        gamification: mockGamification,
      };
      expect(validateBackup(bad).isValid).toBe(false);
    });

    it('rejects corrupted collection items', () => {
      const bad = {
        version: 1,
        exportedAt: '2026-11-21',
        collections: [{ id: 'col-1', name: 'Sin icono' }], // Falta icon, accentColor, statuses
        items: [],
        gamification: mockGamification,
      };
      const res = validateBackup(bad);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('La colección en el índice 0');
      }
    });

    it('rejects corrupted item elements', () => {
      const bad = {
        version: 1,
        exportedAt: '2026-11-21',
        collections: mockCollections,
        items: [{ id: 'it-1', title: 'Falta collectionId' }],
        gamification: mockGamification,
      };
      const res = validateBackup(bad);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('El ítem en el índice 0');
      }
    });

    it('rejects corrupted gamification data', () => {
      const badXp = {
        version: 1,
        exportedAt: '2026-11-21',
        collections: [],
        items: [],
        gamification: { ...mockGamification, totalXp: -10 },
      };
      expect(validateBackup(badXp).isValid).toBe(false);

      const badStreak = {
        version: 1,
        exportedAt: '2026-11-21',
        collections: [],
        items: [],
        gamification: { ...mockGamification, streak: null },
      };
      expect(validateBackup(badStreak).isValid).toBe(false);

      const badLists = {
        version: 1,
        exportedAt: '2026-11-21',
        collections: [],
        items: [],
        gamification: {
          ...mockGamification,
          unlockedAchievements: 'no es un array',
        },
      };
      expect(validateBackup(badLists).isValid).toBe(false);
    });
  });
});
