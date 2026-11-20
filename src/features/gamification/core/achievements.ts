import type {
  Achievement,
  GamificationEvaluationState,
} from '@/interfaces/gamification.interface';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_item',
    title: 'Primer ejemplar',
    description: 'Añade tu primer ítem a cualquier colección.',
    icon: 'PackagePlus',
    category: 'catalog',
    tier: 'bronze',
    xpReward: 20,
    condition: (state) => state.items.length >= 1,
  },
  {
    id: 'five_items',
    title: 'Coleccionista activo',
    description: 'Acumula al menos 5 ítems en tu catálogo.',
    icon: 'Layers',
    category: 'catalog',
    tier: 'bronze',
    xpReward: 40,
    condition: (state) => state.items.length >= 5,
  },
  {
    id: 'twenty_five_items',
    title: 'Bóveda en expansión',
    description: 'Alcanza los 25 ítems registrados en total.',
    icon: 'Archive',
    category: 'catalog',
    tier: 'silver',
    xpReward: 80,
    condition: (state) => state.items.length >= 25,
  },
  {
    id: 'first_completed',
    title: 'Objetivo cumplido',
    description: 'Marca tu primer ítem como completado.',
    icon: 'CheckCircle2',
    category: 'completion',
    tier: 'bronze',
    xpReward: 30,
    condition: (state) => state.items.some((it) => it.xpAwarded),
  },
  {
    id: 'five_completed',
    title: 'Hábito de finalización',
    description: 'Completa al menos 5 ítems de tus colecciones.',
    icon: 'Trophy',
    category: 'completion',
    tier: 'silver',
    xpReward: 70,
    condition: (state) =>
      state.items.filter((it) => it.xpAwarded).length >= 5,
  },
  {
    id: 'first_review',
    title: 'Crítica constructiva',
    description: 'Valora o escribe notas personales en un ítem.',
    icon: 'PenTool',
    category: 'reviews',
    tier: 'bronze',
    xpReward: 25,
    condition: (state) =>
      state.items.some(
        (it) =>
          it.reviewXpAwarded ||
          it.rating !== undefined ||
          (typeof it.notes === 'string' && it.notes.trim().length > 0)
      ),
  },
  {
    id: 'five_reviews',
    title: 'Voz autorizada',
    description: 'Valora o reseña al menos 5 ítems diferentes.',
    icon: 'MessageSquareText',
    category: 'reviews',
    tier: 'silver',
    xpReward: 60,
    condition: (state) =>
      state.items.filter(
        (it) =>
          it.reviewXpAwarded ||
          it.rating !== undefined ||
          (typeof it.notes === 'string' && it.notes.trim().length > 0)
      ).length >= 5,
  },
  {
    id: 'multi_collector',
    title: 'Curiosidad multidisciplinar',
    description: 'Crea y posee ítems en al menos 3 colecciones distintas.',
    icon: 'Boxes',
    category: 'catalog',
    tier: 'silver',
    xpReward: 60,
    condition: (state) => {
      const collectionsWithItems = new Set(
        state.items.map((it) => it.collectionId)
      );
      return collectionsWithItems.size >= 3;
    },
  },
  {
    id: 'collection_master',
    title: 'Maestro de la estantería',
    description:
      'Completa el 100% de los ítems de una colección (mínimo 3 ítems).',
    icon: 'Crown',
    category: 'completion',
    tier: 'gold',
    xpReward: 120,
    condition: (state) => {
      return state.collections.some((col) => {
        const colItems = state.items.filter((it) => it.collectionId === col.id);
        if (colItems.length < 3) return false;
        return colItems.every((it) => it.xpAwarded);
      });
    },
  },
  {
    id: 'streak_3',
    title: 'Constancia inicial',
    description: 'Mantén una racha activa de 3 días consecutivos.',
    icon: 'Flame',
    category: 'streaks',
    tier: 'bronze',
    xpReward: 35,
    condition: (state) => state.streak.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Fervor semanal',
    description: 'Alcanza una racha de 7 días consecutivos.',
    icon: 'Sparkles',
    category: 'streaks',
    tier: 'silver',
    xpReward: 75,
    condition: (state) => state.streak.currentStreak >= 7,
  },
  {
    id: 'level_5',
    title: 'Archivista de prestigio',
    description: 'Alcanza el nivel 5 de experiencia.',
    icon: 'Medal',
    category: 'special',
    tier: 'gold',
    xpReward: 100,
    condition: (state) => state.totalXp >= 700,
  },
];

export function evaluateAchievements(
  state: GamificationEvaluationState
): Achievement[] {
  return ACHIEVEMENTS.filter((ach) => {
    if (state.alreadyUnlockedIds.has(ach.id)) {
      return false;
    }
    return ach.condition(state);
  });
}
