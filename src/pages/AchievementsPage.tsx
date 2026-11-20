import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Trophy,
  Sparkles,
  Flame,
  Award,
  Layers,
  CheckCircle2,
  MessageSquareText,
  Zap,
} from 'lucide-react';
import { Header } from '@/components/custom/Header';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { calculateLevelProgress } from '@/features/gamification/core/levels';
import { ACHIEVEMENTS } from '@/features/gamification/core/achievements';
import { AchievementCard } from '@/features/gamification/components/AchievementCard';
import type {
  AchievementCategory,
  UnlockedAchievement,
} from '@/interfaces/gamification.interface';
import { cn } from '@/lib/utils';

type FilterCategory = 'all' | AchievementCategory;

interface CategoryFilterOption {
  key: FilterCategory;
  label: string;
  icon: typeof Trophy;
}

const CATEGORY_OPTIONS: CategoryFilterOption[] = [
  { key: 'all', label: 'Todos', icon: Trophy },
  { key: 'catalog', label: 'Catálogo', icon: Layers },
  { key: 'completion', label: 'Completados', icon: CheckCircle2 },
  { key: 'reviews', label: 'Reseñas', icon: MessageSquareText },
  { key: 'streaks', label: 'Rachas', icon: Flame },
  { key: 'special', label: 'Especiales', icon: Zap },
];

export function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>('all');

  const totalXp = useGamificationStore((state) => state.totalXp);
  const streak = useGamificationStore((state) => state.streak);
  const unlockedAchievements = useGamificationStore(
    (state) => state.unlockedAchievements
  );

  const progress = calculateLevelProgress(totalXp);
  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const overallPercentage =
    totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Mapa rápido de logros desbloqueados por id
  const unlockedMap = useMemo(() => {
    const map = new Map<string, UnlockedAchievement>();
    for (const item of unlockedAchievements) {
      map.set(item.achievementId, item);
    }
    return map;
  }, [unlockedAchievements]);

  // Contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, { total: number; unlocked: number }> = {
      all: { total: totalCount, unlocked: unlockedCount },
      catalog: { total: 0, unlocked: 0 },
      completion: { total: 0, unlocked: 0 },
      reviews: { total: 0, unlocked: 0 },
      streaks: { total: 0, unlocked: 0 },
      special: { total: 0, unlocked: 0 },
    };

    for (const ach of ACHIEVEMENTS) {
      if (counts[ach.category]) {
        counts[ach.category].total += 1;
        if (unlockedMap.has(ach.id)) {
          counts[ach.category].unlocked += 1;
        }
      }
    }

    return counts;
  }, [totalCount, unlockedCount, unlockedMap]);

  // Lista filtrada de logros
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') {
      return ACHIEVEMENTS;
    }
    return ACHIEVEMENTS.filter((ach) => ach.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="container mx-auto max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* Navegación de vuelta */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md py-1 px-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Volver a colecciones</span>
          </Link>
        </div>

        {/* Tarjeta de resumen de perfil del coleccionista */}
        <section
          aria-label="Resumen de nivel y experiencia"
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card to-card/60 p-6 sm:p-8 shadow-xs"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30">
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Nivel {progress.level}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                    {progress.title}
                  </span>
                </div>

                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  {progress.currentLevelXp} / {progress.nextLevelXp} XP para el
                  siguiente nivel ({progress.progressPercentage}%)
                </p>
              </div>
            </div>

            {/* Métricas destacadas */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-6 text-center sm:text-left">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  XP Total
                </p>
                <p className="mt-1 font-mono text-base sm:text-xl font-bold text-foreground">
                  {progress.totalXp}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Racha
                </p>
                <div className="mt-1 flex items-center justify-center sm:justify-start gap-1 font-mono text-base sm:text-xl font-bold text-amber-500">
                  <Flame className="h-4 w-4 fill-amber-500" aria-hidden="true" />
                  <span>{streak.currentStreak} d</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Récord: {streak.longestStreak} d
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Logros
                </p>
                <div className="mt-1 flex items-center justify-center sm:justify-start gap-1 font-mono text-base sm:text-xl font-bold text-foreground">
                  <Award className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>
                    {unlockedCount}
                    <span className="text-muted-foreground text-sm font-normal">
                      /{totalCount}
                    </span>
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {overallPercentage}% completado
                </p>
              </div>
            </div>
          </div>

          {/* Barra de progreso de XP detallada */}
          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">
                Progreso del Nivel {progress.level}
              </span>
              <span className="font-mono font-semibold">
                {progress.progressPercentage}%
              </span>
            </div>

            <div
              className="h-3 w-full overflow-hidden rounded-full bg-muted border border-border/40"
              role="progressbar"
              aria-valuenow={progress.progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso del Nivel ${progress.level}: ${progress.progressPercentage}%`}
            >
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
          </div>
        </section>

        {/* Sección de logros y filtros */}
        <section aria-label="Catálogo de logros" className="mt-8 sm:mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Insignias y Retos
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Desbloquea logros catalogando, valorando y manteniendo tu constancia.
              </p>
            </div>

            <span className="text-xs text-muted-foreground self-start sm:self-auto font-mono">
              {unlockedCount} de {totalCount} conseguidos
            </span>
          </div>

          {/* Píldoras de filtro de categoría */}
          <div
            role="toolbar"
            aria-label="Filtrar logros por categoría"
            className="mt-4 flex flex-wrap items-center gap-2 pb-2"
          >
            {CATEGORY_OPTIONS.map((opt) => {
              const counts = categoryCounts[opt.key];
              const isSelected = selectedCategory === opt.key;
              const IconComp = opt.icon;

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedCategory(opt.key)}
                  aria-pressed={isSelected}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <IconComp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      'ml-1 font-mono text-[10px] rounded-full px-1.5 py-0.2',
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {counts.unlocked}/{counts.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cuadrícula responsiva de logros */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlockedInfo={unlockedMap.get(achievement.id)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
