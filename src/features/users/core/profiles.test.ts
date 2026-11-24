import { describe, expect, it } from 'vitest';
import type { Collection } from '@/interfaces/collection.interface';
import type { Profile, ProfileRow } from '@/interfaces/user.interface';
import {
  filterPublicCollections,
  generateInitials,
  mapProfileRowToProfile,
  mapProfileToRow,
  validateUsername,
} from './profiles';

describe('profiles core logic', () => {
  describe('validateUsername', () => {
    it('accepts valid usernames conforming to ^[a-z0-9_]{3,20}$', () => {
      expect(validateUsername('javi')).toEqual({ isValid: true });
      expect(validateUsername('gamer_2026')).toEqual({ isValid: true });
      expect(validateUsername('alex_99')).toEqual({ isValid: true });
      expect(validateUsername('abc')).toEqual({ isValid: true });
      expect(validateUsername('user_name_valid_1234')).toEqual({ isValid: true });
    });

    it('rejects empty or whitespace-only strings', () => {
      expect(validateUsername('')).toEqual({
        isValid: false,
        error: 'El nombre de usuario no puede estar vacío.',
      });
      expect(validateUsername('   ')).toEqual({
        isValid: false,
        error: 'El nombre de usuario no puede estar vacío.',
      });
    });

    it('rejects usernames shorter than 3 characters', () => {
      expect(validateUsername('a')).toEqual({
        isValid: false,
        error: 'El nombre de usuario debe tener al menos 3 caracteres.',
      });
      expect(validateUsername('ab')).toEqual({
        isValid: false,
        error: 'El nombre de usuario debe tener al menos 3 caracteres.',
      });
    });

    it('rejects usernames longer than 20 characters', () => {
      const longUsername = 'a'.repeat(21);
      expect(validateUsername(longUsername)).toEqual({
        isValid: false,
        error: 'El nombre de usuario no puede superar los 20 caracteres.',
      });
    });

    it('rejects uppercase letters, spaces, hyphens and special characters', () => {
      const invalidCases = [
        'Javi',
        'javi gomez',
        'alex-dev',
        'user@dev',
        'javi!',
        'gamer#1',
        'cómic_fan',
      ];

      for (const invalid of invalidCases) {
        const result = validateUsername(invalid);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(
          /solo puede contener letras minúsculas/i
        );
      }
    });
  });

  describe('generateInitials', () => {
    it('generates two uppercase letters for multi-word names', () => {
      expect(generateInitials('Javi Gómez')).toBe('JG');
      expect(generateInitials('Alex Doe Smith')).toBe('AD');
      expect(generateInitials('  maria   perez  ')).toBe('MP');
    });

    it('generates up to two uppercase letters for single-word names', () => {
      expect(generateInitials('Alex')).toBe('AL');
      expect(generateInitials('J')).toBe('J');
    });

    it('falls back to username when displayName is missing or empty', () => {
      expect(generateInitials('', 'alex_99')).toBe('AL');
      expect(generateInitials('   ', 'retro_gamer')).toBe('RE');
    });

    it('falls back to "?" when both displayName and username are empty', () => {
      expect(generateInitials('', '')).toBe('?');
      expect(generateInitials('   ', undefined)).toBe('?');
    });
  });

  describe('mapProfileRowToProfile', () => {
    it('maps database ProfileRow to domain Profile with all fields populated', () => {
      const row: ProfileRow = {
        id: 'usr-123',
        username: 'javi_dev',
        display_name: 'Javi Gómez',
        avatar_url: 'https://example.com/avatar.png',
        bio: 'Coleccionista de videojuegos y cómics',
        is_public: true,
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-02T12:00:00Z',
      };

      const profile: Profile = mapProfileRowToProfile(row);

      expect(profile).toEqual({
        id: 'usr-123',
        username: 'javi_dev',
        displayName: 'Javi Gómez',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'Coleccionista de videojuegos y cómics',
        isPublic: true,
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-02T12:00:00Z',
      });
    });

    it('handles nullable avatarUrl and bio, defaulting isPublic to true if absent', () => {
      const row: ProfileRow = {
        id: 'usr-456',
        username: 'anon_user',
        display_name: 'Anonymous',
        avatar_url: null,
        bio: null,
        is_public: false,
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z',
      };

      const profile = mapProfileRowToProfile(row);

      expect(profile.avatarUrl).toBeNull();
      expect(profile.bio).toBeNull();
      expect(profile.isPublic).toBe(false);
    });
  });

  describe('mapProfileToRow', () => {
    it('maps domain Profile mutations to partial database row', () => {
      const profileMutation: Partial<Profile> & { id: string } = {
        id: 'usr-123',
        username: 'javi_pro',
        displayName: 'Javi Pro',
        bio: 'Nueva biografía',
        isPublic: false,
        updatedAt: '2026-11-24T12:00:00Z',
      };

      const row = mapProfileToRow(profileMutation);

      expect(row).toEqual({
        id: 'usr-123',
        username: 'javi_pro',
        display_name: 'Javi Pro',
        bio: 'Nueva biografía',
        is_public: false,
        updated_at: '2026-11-24T12:00:00Z',
      });
      expect(row.avatar_url).toBeUndefined();
    });
  });

  describe('filterPublicCollections', () => {
    it('filters collections keeping only those with isPublic !== false', () => {
      const collections: Collection[] = [
        {
          id: 'c1',
          name: 'Pública 1',
          icon: 'Gamepad2',
          accentColor: '#6366f1',
          provider: 'manual',
          statuses: [],
          isPublic: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'c2',
          name: 'Privada',
          icon: 'Book',
          accentColor: '#10b981',
          provider: 'manual',
          statuses: [],
          isPublic: false,
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'c3',
          name: 'Por defecto pública (sin isPublic explícito)',
          icon: 'Music',
          accentColor: '#ec4899',
          provider: 'manual',
          statuses: [],
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];

      const publicCollections = filterPublicCollections(collections);

      expect(publicCollections).toHaveLength(2);
      expect(publicCollections.map((c) => c.id)).toEqual(['c1', 'c3']);
    });
  });
});
