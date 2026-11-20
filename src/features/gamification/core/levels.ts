import type { LevelProgress } from '@/interfaces/gamification.interface';

export const XP_RULES = {
  ADD_ITEM: 10,
  COMPLETE_ITEM: 50,
  RATE_AND_REVIEW: 25,
  COMPLETE_COLLECTION: 100,
  DAILY_STREAK_BONUS: 15,
} as const;

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Iniciado',
  2: 'Aprendiz de Coleccionista',
  3: 'Catalogador Curioso',
  4: 'Aficionado Dedicado',
  5: 'Archivista',
  6: 'Guardián de Joyas',
  7: 'Conservador Experto',
  8: 'Gran Erudito',
  9: 'Maestro del Catálogo',
  10: 'Leyenda de Hoardex',
};

/**
 * Cada nivel L requiere 100 + (L - 1) * 50 XP acumulados dentro de ese nivel.
 * Nivel 1: 0..99 (requiere 100)
 * Nivel 2: 100..249 (requiere 150)
 * Nivel 3: 250..449 (requiere 200)
 * Nivel 4: 450..699 (requiere 250)
 * Nivel 5: 700..999 (requiere 300)
 */
export function getRequiredXpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 + (safeLevel - 1) * 50;
}

export function calculateLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let accumulatedXp = 0;

  while (true) {
    const requiredForCurrent = getRequiredXpForLevel(level);
    if (accumulatedXp + requiredForCurrent > safeXp) {
      const currentLevelXp = safeXp - accumulatedXp;
      const progressPercentage = Math.min(
        100,
        Math.floor((currentLevelXp / requiredForCurrent) * 100)
      );
      const title = LEVEL_TITLES[Math.min(10, level)] ?? LEVEL_TITLES[10];

      return {
        level,
        title,
        currentLevelXp,
        nextLevelXp: requiredForCurrent,
        totalXp: safeXp,
        progressPercentage,
      };
    }
    accumulatedXp += requiredForCurrent;
    level++;
  }
}
