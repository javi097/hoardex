import { describe, expect, it } from 'vitest';
import {
  COLLECTION_TEMPLATES,
  createCollection,
  validateStatuses,
} from './templates';
import type { CollectionStatus } from '@/interfaces/collection.interface';

describe('templates core logic', () => {
  const validStatuses: CollectionStatus[] = [
    { id: '1', label: 'Pendiente', isCompleted: false, order: 0 },
    { id: '2', label: 'En curso', isCompleted: false, order: 1 },
    { id: '3', label: 'Completado', isCompleted: true, order: 2 },
  ];

  describe('validateStatuses', () => {
    it('accepts status list with exactly one completed status', () => {
      expect(() => validateStatuses(validStatuses)).not.toThrow();
    });

    it('throws error when no completed status is provided', () => {
      const invalidStatuses: CollectionStatus[] = [
        { id: '1', label: 'Pendiente', isCompleted: false, order: 0 },
        { id: '2', label: 'En curso', isCompleted: false, order: 1 },
      ];
      expect(() => validateStatuses(invalidStatuses)).toThrowError(
        /debe tener exactamente un estado marcado como completado/i
      );
    });

    it('throws error when more than one completed status is provided', () => {
      const invalidStatuses: CollectionStatus[] = [
        { id: '1', label: 'Terminado A', isCompleted: true, order: 0 },
        { id: '2', label: 'Terminado B', isCompleted: true, order: 1 },
      ];
      expect(() => validateStatuses(invalidStatuses)).toThrowError(
        /debe tener exactamente un estado marcado como completado/i
      );
    });
  });

  describe('createCollection', () => {
    const fixedNow = '2026-11-18T12:00:00.000Z';

    it('generates a collection with valid id and matching createdAt', () => {
      const collection = createCollection(
        {
          name: 'Mis Videojuegos',
          description: 'Colección retro y actual',
          icon: 'Gamepad2',
          accentColor: '#6366f1',
          provider: 'rawg',
          statuses: validStatuses,
        },
        fixedNow
      );

      expect(collection.id).toBeDefined();
      expect(typeof collection.id).toBe('string');
      expect(collection.id.length).toBeGreaterThan(0);
      expect(collection.createdAt).toBe(fixedNow);
      expect(collection.name).toBe('Mis Videojuegos');
      expect(collection.description).toBe('Colección retro y actual');
      expect(collection.icon).toBe('Gamepad2');
      expect(collection.accentColor).toBe('#6366f1');
      expect(collection.provider).toBe('rawg');
      expect(collection.statuses).toEqual(validStatuses);
      expect(collection.isPublic).toBe(true);
    });

    it('respects isPublic flag when creating a private collection', () => {
      const collection = createCollection(
        {
          name: 'Colección Secreta',
          icon: 'Lock',
          accentColor: '#10b981',
          provider: 'manual',
          statuses: validStatuses,
          isPublic: false,
        },
        fixedNow
      );

      expect(collection.isPublic).toBe(false);
    });

    it('throws error when creating collection without completed status', () => {
      const noCompleted: CollectionStatus[] = [
        { id: '1', label: 'Pendiente', isCompleted: false, order: 0 },
      ];
      expect(() =>
        createCollection(
          {
            name: 'Test',
            icon: 'LayoutGrid',
            accentColor: '#8b5cf6',
            provider: 'manual',
            statuses: noCompleted,
          },
          fixedNow
        )
      ).toThrow();
    });

    it('throws error when creating collection with multiple completed statuses', () => {
      const multipleCompleted: CollectionStatus[] = [
        { id: '1', label: 'Terminado 1', isCompleted: true, order: 0 },
        { id: '2', label: 'Terminado 2', isCompleted: true, order: 1 },
      ];
      expect(() =>
        createCollection(
          {
            name: 'Test',
            icon: 'LayoutGrid',
            accentColor: '#8b5cf6',
            provider: 'manual',
            statuses: multipleCompleted,
          },
          fixedNow
        )
      ).toThrow();
    });
  });

  describe('COLLECTION_TEMPLATES', () => {
    it('has exactly 6 predefined templates', () => {
      expect(COLLECTION_TEMPLATES.length).toBe(6);
    });

    it('ensures each template has exactly 1 completed status', () => {
      COLLECTION_TEMPLATES.forEach((template) => {
        const completedStatuses = template.defaultStatuses.filter(
          (status) => status.isCompleted
        );
        expect(completedStatuses.length).toBe(1);
      });
    });

    it('ensures each template has all required non-empty fields', () => {
      const expectedIds = [
        'videogames',
        'books',
        'boardgames',
        'figures',
        'music',
        'custom',
      ];
      const actualIds = COLLECTION_TEMPLATES.map((t) => t.id);
      expect(actualIds).toEqual(expectedIds);

      COLLECTION_TEMPLATES.forEach((template) => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(['manual', 'rawg', 'openLibrary', 'bgg']).toContain(
          template.provider
        );
        expect(template.defaultStatuses.length).toBeGreaterThanOrEqual(1);

        template.defaultStatuses.forEach((status, idx) => {
          expect(status.id).toBeTruthy();
          expect(status.label).toBeTruthy();
          expect(typeof status.isCompleted).toBe('boolean');
          expect(status.order).toBe(idx);
        });
      });
    });
  });
});
