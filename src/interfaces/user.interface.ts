import type { Collection } from './collection.interface';
import type { Item } from './item.interface';
import type { UnlockedAchievement } from './gamification.interface';

/**
 * Entidad de dominio de perfil de usuario.
 */
export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fila en PostgreSQL para la tabla profiles (snake_case).
 */
export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Parámetros para actualizar el perfil del usuario autenticado.
 */
export interface UpdateProfileParams {
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isPublic?: boolean;
}

/**
 * Resumen de gamificación pública para la vista de perfil /u/:username.
 */
export interface PublicGamificationSummary {
  level: number;
  levelTitle: string;
  totalXp: number;
  longestStreak: number;
  unlockedAchievements: UnlockedAchievement[];
}

/**
 * Modelo agregado con toda la información pública de un perfil en /u/:username.
 */
export interface PublicProfileData {
  profile: Profile;
  collections: Collection[];
  items: Item[];
  gamification: PublicGamificationSummary;
}

/**
 * Resultado de la validación pura del formato de un @username.
 */
export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}
