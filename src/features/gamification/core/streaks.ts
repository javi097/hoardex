import type { StreakCalculationResult } from '@/interfaces/gamification.interface';

/**
 * Calcula la diferencia exacta en días naturales UTC entre dos fechas 'YYYY-MM-DD'.
 * Devuelve un número positivo si endDate es posterior a startDate.
 */
export function getDaysDifference(startDate: string, endDate: string): number {
  const [yA, mA, dA] = startDate.split('-').map(Number);
  const [yB, mB, dB] = endDate.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  const diffMs = utcB - utcA;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Función pura que calcula la racha actual y récord histórico deterministamente.
 * No utiliza el reloj del sistema ni Date.now().
 */
export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActivityDate: string | null,
  today: string
): StreakCalculationResult {
  const safeCurrent = Math.max(0, Math.floor(currentStreak));
  const safeLongest = Math.max(0, Math.floor(longestStreak));

  // Primer registro de actividad en la plataforma
  if (!lastActivityDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, safeLongest),
      lastActivityDate: today,
      isExtended: true,
    };
  }

  const diff = getDaysDifference(lastActivityDate, today);

  // Mismo día natural: no avanza la racha pero se mantiene activa
  if (diff === 0) {
    return {
      currentStreak: Math.max(1, safeCurrent),
      longestStreak: Math.max(1, safeLongest, safeCurrent),
      lastActivityDate: today,
      isExtended: false,
    };
  }

  // Día inmediatamente consecutivo (diff === 1): racha extendida
  if (diff === 1) {
    const newCurrent = Math.max(1, safeCurrent) + 1;
    return {
      currentStreak: newCurrent,
      longestStreak: Math.max(safeLongest, newCurrent),
      lastActivityDate: today,
      isExtended: true,
    };
  }

  // Si diff > 1 (o fecha en pasado anómalo): racha rota, se reinicia a 1
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, safeLongest),
    lastActivityDate: today,
    isExtended: true,
  };
}
