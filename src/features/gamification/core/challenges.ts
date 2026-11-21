import type {
  Challenge,
  ChallengeEvaluationState,
  ChallengeProgress,
  WeekBoundaries,
} from '@/interfaces/gamification.interface';

/**
 * Calcula de forma 100% pura y determinista en UTC el lunes de inicio,
 * domingo de fin y la clave ISO 'YYYY-Www' para una fecha 'YYYY-MM-DD'.
 * Sin Date.now() ni reloj del sistema.
 */
export function getWeekBoundaries(dateStr: string): WeekBoundaries {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const target = new Date(Date.UTC(year, month, day));

  // Día de la semana: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const dayOfWeek = target.getUTCDay();
  // Día ISO: Lunes = 0, Martes = 1, ..., Domingo = 6
  const isoDay = (dayOfWeek + 6) % 7;

  // Lunes de la semana ISO
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() - isoDay);

  // Domingo de la semana ISO
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  // El año y número de semana ISO se basan en el Jueves de esa semana
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);

  // El 4 de enero siempre cae en la semana 1 del año ISO
  const firstThursdayOfYear = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstIsoDay = (firstThursdayOfYear.getUTCDay() + 6) % 7;
  const firstMondayOfYear = new Date(firstThursdayOfYear);
  firstMondayOfYear.setUTCDate(firstThursdayOfYear.getUTCDate() - firstIsoDay);

  const weekNumber =
    Math.floor(
      (monday.getTime() - firstMondayOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;

  const weekPad = String(weekNumber).padStart(2, '0');
  const weekKey = `${thursday.getUTCFullYear()}-W${weekPad}`;

  return {
    weekKey,
    startOfWeek: monday.toISOString().slice(0, 10),
    endOfWeek: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Catálogo base declarativo de retos para Hoardex.
 */
export const CHALLENGES: Challenge[] = [
  // --- Retos Semanales ---
  {
    id: 'weekly_add_items',
    title: 'Catalogador semanal',
    description: 'Añade al menos 2 ítems a tus colecciones esta semana.',
    category: 'weekly',
    icon: 'PackagePlus',
    target: 2,
    xpReward: 30,
    computeProgress: (state, _today, boundaries) => {
      return state.items.filter((it) => {
        const itemDate = it.createdAt.slice(0, 10);
        return (
          itemDate >= boundaries.startOfWeek && itemDate <= boundaries.endOfWeek
        );
      }).length;
    },
  },
  {
    id: 'weekly_complete_items',
    title: 'Avance constante',
    description: 'Completa al menos 1 ítem de tus colecciones esta semana.',
    category: 'weekly',
    icon: 'CheckCircle2',
    target: 1,
    xpReward: 40,
    computeProgress: (state, _today, boundaries) => {
      const eventsCount = state.xpHistory.filter(
        (ev) =>
          ev.action === 'complete_item' &&
          ev.timestamp.slice(0, 10) >= boundaries.startOfWeek &&
          ev.timestamp.slice(0, 10) <= boundaries.endOfWeek
      ).length;

      if (eventsCount > 0) return eventsCount;

      return state.items.filter((it) => {
        if (!it.xpAwarded) return false;
        const updateDate = it.updatedAt.slice(0, 10);
        return (
          updateDate >= boundaries.startOfWeek &&
          updateDate <= boundaries.endOfWeek
        );
      }).length;
    },
  },
  {
    id: 'weekly_review_items',
    title: 'Ojo crítico',
    description: 'Escribe notas o asigna valoración a al menos 1 ítem esta semana.',
    category: 'weekly',
    icon: 'Star',
    target: 1,
    xpReward: 25,
    computeProgress: (state, _today, boundaries) => {
      const eventsCount = state.xpHistory.filter(
        (ev) =>
          ev.action === 'rate_and_review' &&
          ev.timestamp.slice(0, 10) >= boundaries.startOfWeek &&
          ev.timestamp.slice(0, 10) <= boundaries.endOfWeek
      ).length;

      if (eventsCount > 0) return eventsCount;

      return state.items.filter((it) => {
        if (!it.reviewXpAwarded) return false;
        const updateDate = it.updatedAt.slice(0, 10);
        return (
          updateDate >= boundaries.startOfWeek &&
          updateDate <= boundaries.endOfWeek
        );
      }).length;
    },
  },

  // --- Retos de Hitos ---
  {
    id: 'milestone_collections',
    title: 'Cimientos firmes',
    description: 'Crea al menos 2 colecciones para organizar tus aficiones.',
    category: 'milestone',
    icon: 'Layers',
    target: 2,
    xpReward: 30,
    computeProgress: (state) => {
      return state.collections.length;
    },
  },
  {
    id: 'milestone_star_ratings',
    title: 'Crítico consagrado',
    description: 'Asigna valoración con estrellas a al menos 3 ítems.',
    category: 'milestone',
    icon: 'Sparkles',
    target: 3,
    xpReward: 50,
    computeProgress: (state) => {
      return state.items.filter(
        (it) => it.rating !== undefined && it.rating > 0
      ).length;
    },
  },
  {
    id: 'milestone_streak',
    title: 'Constancia de bronce',
    description: 'Alcanza una racha récord de al menos 3 días.',
    category: 'milestone',
    icon: 'Flame',
    target: 3,
    xpReward: 40,
    computeProgress: (state) => {
      return Math.max(state.streak.currentStreak, state.streak.longestStreak);
    },
  },
];

/**
 * Evalúa el progreso individual de un reto dado un estado y límites semanales.
 */
export function calculateChallengeProgress(
  challenge: Challenge,
  state: ChallengeEvaluationState,
  today: string,
  boundaries: WeekBoundaries
): ChallengeProgress {
  const rawProgress = challenge.computeProgress(state, today, boundaries);
  const current = Math.min(
    challenge.target,
    Math.max(0, Math.floor(rawProgress))
  );
  const percentage =
    challenge.target > 0
      ? Math.min(100, Math.floor((current / challenge.target) * 100))
      : 100;
  const isCompleted = current >= challenge.target;

  const uniqueKey =
    challenge.category === 'weekly'
      ? `${challenge.id}_${boundaries.weekKey}`
      : challenge.id;

  const isClaimed = state.claimedChallengeIds.includes(uniqueKey);

  return {
    challengeId: challenge.id,
    uniqueKey,
    title: challenge.title,
    description: challenge.description,
    category: challenge.category,
    icon: challenge.icon,
    current,
    target: challenge.target,
    percentage,
    xpReward: challenge.xpReward,
    isCompleted,
    isClaimed,
  };
}

/**
 * Evalúa todos los retos de la lista devolviendo su estado de progreso ordenado.
 */
export function evaluateAllChallenges(
  challenges: Challenge[],
  state: ChallengeEvaluationState,
  today: string
): ChallengeProgress[] {
  const boundaries = getWeekBoundaries(today);
  return challenges.map((challenge) =>
    calculateChallengeProgress(challenge, state, today, boundaries)
  );
}
