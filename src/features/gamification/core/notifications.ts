import { toast } from 'sonner';
import type { ActionResult } from '@/features/gamification/store/gamification.store';

/**
 * Dispara notificaciones toast enriquecidas con Sonner tras una acción de gamificación.
 * - Subida de nivel: mensaje celebratorio con nuevo nivel y título honorífico.
 * - Logros desbloqueados: notificación individual por cada logro obtenido con su título y recompensa.
 */
export function notifyGamificationResult(result: ActionResult): void {
  // 1. Notificación de subida de nivel
  if (result.leveledUp) {
    toast.success(
      `¡Subiste de nivel! Has alcanzado el Nivel ${result.newLevel}: ${result.newLevelTitle}`
    );
  }

  // 2. Notificaciones por logros desbloqueados
  for (const achievement of result.newlyUnlockedAchievements) {
    toast.success(
      `¡Logro desbloqueado! ${achievement.title} (+${achievement.xpReward} XP)`
    );
  }
}
