import type { Collection } from '@/interfaces/collection.interface';
import type {
  Profile,
  ProfileRow,
  UsernameValidationResult,
} from '@/interfaces/user.interface';

/**
 * Valida de forma pura el formato de un @username.
 * Regla: 3 a 20 caracteres, únicamente letras minúsculas (a-z), números (0-9) y guiones bajos (_).
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username || username.trim().length === 0) {
    return {
      isValid: false,
      error: 'El nombre de usuario no puede estar vacío.',
    };
  }

  if (username.length < 3) {
    return {
      isValid: false,
      error: 'El nombre de usuario debe tener al menos 3 caracteres.',
    };
  }

  if (username.length > 20) {
    return {
      isValid: false,
      error: 'El nombre de usuario no puede superar los 20 caracteres.',
    };
  }

  const regex = /^[a-z0-9_]{3,20}$/;
  if (!regex.test(username)) {
    return {
      isValid: false,
      error:
        'El nombre de usuario solo puede contener letras minúsculas (a-z), números (0-9) y guiones bajos (_).',
    };
  }

  return { isValid: true };
}

/**
 * Genera iniciales (1 o 2 letras mayúsculas) a partir de un nombre o username para el avatar fallback.
 */
export function generateInitials(displayName: string, username?: string): string {
  const source = displayName?.trim() || username?.trim() || '?';
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

/**
 * Mapea una fila PostgREST de profiles a la entidad Profile del dominio.
 */
export function mapProfileRowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    isPublic: row.is_public ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Mapea la entidad Profile a la fila ProfileRow para inserción o actualización en Supabase.
 */
export function mapProfileToRow(
  profile: Partial<Profile> & { id: string }
): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = { id: profile.id };
  if (profile.username !== undefined) row.username = profile.username;
  if (profile.displayName !== undefined) row.display_name = profile.displayName;
  if (profile.avatarUrl !== undefined) row.avatar_url = profile.avatarUrl;
  if (profile.bio !== undefined) row.bio = profile.bio;
  if (profile.isPublic !== undefined) row.is_public = profile.isPublic;
  if (profile.createdAt !== undefined) row.created_at = profile.createdAt;
  if (profile.updatedAt !== undefined) row.updated_at = profile.updatedAt;
  return row;
}

/**
 * Filtra puramente las colecciones que son públicas (isPublic !== false).
 */
export function filterPublicCollections(collections: Collection[]): Collection[] {
  return collections.filter((c) => c.isPublic !== false);
}
