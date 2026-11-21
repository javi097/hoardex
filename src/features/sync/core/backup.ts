import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import type {
  HoardexBackup,
  PersistedGamificationData,
} from '@/interfaces/sync.interface';

/**
 * Genera una copia de seguridad oficial versionada (version: 1).
 */
export function generateBackup(
  collections: Collection[],
  items: Item[],
  gamification: PersistedGamificationData,
  exportedAt: string
): HoardexBackup {
  return {
    version: 1,
    exportedAt,
    collections,
    items,
    gamification,
  };
}

export type ValidationResult =
  | { isValid: true; backup: HoardexBackup }
  | { isValid: false; error: string };

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Validador nativo defensivo en TypeScript para verificar la integridad
 * estructural de un archivo de copia de seguridad JSON de Hoardex sin dependencias externas.
 */
export function validateBackup(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return {
      isValid: false,
      error: 'El archivo no contiene un objeto JSON válido.',
    };
  }

  // 1. Verificación de versión
  if (data.version !== 1) {
    return {
      isValid: false,
      error:
        data.version !== undefined
          ? `Versión de copia de seguridad no soportada (${String(data.version)}). Se requiere versión 1.`
          : 'El archivo no contiene el campo de versión requerido.',
    };
  }

  // 2. Verificación de fecha de exportación
  if (typeof data.exportedAt !== 'string' || data.exportedAt.trim().length === 0) {
    return {
      isValid: false,
      error: 'El archivo no contiene una fecha de exportación válida.',
    };
  }

  // 3. Verificación de colecciones
  if (!Array.isArray(data.collections)) {
    return {
      isValid: false,
      error: 'El archivo no contiene una lista válida de colecciones.',
    };
  }

  for (let i = 0; i < data.collections.length; i++) {
    const col = data.collections[i];
    if (
      !isObject(col) ||
      typeof col.id !== 'string' ||
      typeof col.name !== 'string' ||
      typeof col.icon !== 'string' ||
      typeof col.accentColor !== 'string' ||
      typeof col.provider !== 'string' ||
      !Array.isArray(col.statuses)
    ) {
      return {
        isValid: false,
        error: `La colección en el índice ${i} tiene un formato inválido o campos obligatorios ausentes.`,
      };
    }
  }

  // 4. Verificación de ítems
  if (!Array.isArray(data.items)) {
    return {
      isValid: false,
      error: 'El archivo no contiene una lista válida de ítems.',
    };
  }

  for (let i = 0; i < data.items.length; i++) {
    const it = data.items[i];
    if (
      !isObject(it) ||
      typeof it.id !== 'string' ||
      typeof it.collectionId !== 'string' ||
      typeof it.title !== 'string' ||
      typeof it.statusId !== 'string'
    ) {
      return {
        isValid: false,
        error: `El ítem en el índice ${i} tiene un formato inválido o campos obligatorios ausentes.`,
      };
    }
  }

  // 5. Verificación de gamificación
  const gam = data.gamification;
  if (!isObject(gam)) {
    return {
      isValid: false,
      error: 'El archivo no contiene los datos de progreso y gamificación.',
    };
  }

  if (typeof gam.totalXp !== 'number' || isNaN(gam.totalXp) || gam.totalXp < 0) {
    return {
      isValid: false,
      error: 'El valor de experiencia (totalXp) en la copia de seguridad no es válido.',
    };
  }

  if (
    !isObject(gam.streak) ||
    typeof gam.streak.currentStreak !== 'number' ||
    typeof gam.streak.longestStreak !== 'number'
  ) {
    return {
      isValid: false,
      error: 'La información de rachas en la copia de seguridad no es válida.',
    };
  }

  if (
    !Array.isArray(gam.unlockedAchievements) ||
    !Array.isArray(gam.claimedChallengeIds) ||
    !Array.isArray(gam.rewardedCollectionIds) ||
    !Array.isArray(gam.xpHistory)
  ) {
    return {
      isValid: false,
      error: 'Las listas de logros, retos o historial de experiencia no son válidas.',
    };
  }

  return {
    isValid: true,
    backup: data as unknown as HoardexBackup,
  };
}
