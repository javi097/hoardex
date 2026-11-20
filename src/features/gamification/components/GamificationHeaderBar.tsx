import { Link } from 'react-router';
import { Sparkles, Trophy, Flame } from 'lucide-react';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { calculateLevelProgress } from '@/features/gamification/core/levels';
import { ACHIEVEMENTS } from '@/features/gamification/core/achievements';
import { cn } from '@/lib/utils';

export interface Props {
  className?: string;
}

export function GamificationHeaderBar({ className }: Props) {
  const totalXp = useGamificationStore((state) => state.totalXp);
  const streak = useGamificationStore((state) => state.streak);
  const unlockedAchievements = useGamificationStore(
    (state) => state.unlockedAchievements
  );

  const progress = calculateLevelProgress(totalXp);
  const unlockedCount = unlockedAchievements.length;
  const totalAchievements = ACHIEVEMENTS.length;

  const todayIso = new Date().toISOString().slice(0, 10);
  const isStreakActiveToday =
    streak.currentStreak > 0 && streak.lastActivityDate === todayIso;

  return (
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3',
        className
      )}
    >
      {/* Nivel y progreso hacia /achievements */}
      <Link
        to="/achievements"
        className="group flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-muted/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        title={`Nivel ${progress.level}: ${progress.title} (${progress.currentLevelXp} / ${progress.nextLevelXp} XP)`}
        aria-label={`Nivel ${progress.level}: ${progress.title}`}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-bold text-foreground">
              Nv. {progress.level}
            </span>
            <span className="hidden md:inline text-[11px] text-muted-foreground truncate max-w-[120px]">
              {progress.title}
            </span>
          </div>

          {/* Mini barra de progreso */}
          <div
            className="hidden sm:block mt-0.5 h-1.5 w-16 md:w-20 overflow-hidden rounded-full bg-muted border border-border/40"
            role="progressbar"
            aria-valuenow={progress.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso al Nivel ${progress.level + 1}: ${progress.progressPercentage}%`}
          >
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
        </div>
      </Link>

      {/* Racha diaria */}
      <div
        className={cn(
          'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border transition-all',
          isStreakActiveToday
            ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs'
            : streak.currentStreak > 0
              ? 'border-border/60 bg-muted/40 text-muted-foreground'
              : 'border-border/40 bg-muted/20 text-muted-foreground/60'
        )}
        title={
          isStreakActiveToday
            ? `Racha de ${streak.currentStreak} ${streak.currentStreak === 1 ? 'día' : 'días'} completada hoy`
            : streak.currentStreak > 0
              ? `Racha de ${streak.currentStreak} ${streak.currentStreak === 1 ? 'día' : 'días'} (pendiente de acción hoy)`
              : 'Sin racha activa'
        }
        aria-label={
          isStreakActiveToday
            ? `Racha de ${streak.currentStreak} días activa hoy`
            : `Racha de ${streak.currentStreak} días pendiente hoy`
        }
      >
        <Flame
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isStreakActiveToday
              ? 'text-amber-500 fill-amber-500 animate-pulse'
              : 'text-muted-foreground'
          )}
          aria-hidden="true"
        />
        <span className="font-mono text-[11px]">
          {streak.currentStreak}
          <span className="ml-0.5 text-[10px]">d</span>
        </span>
      </div>

      {/* Enlace directo a Logros */}
      <Link
        to="/achievements"
        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 sm:px-2.5 py-0.5 text-xs font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        title={`Logros: ${unlockedCount} de ${totalAchievements} conseguidos`}
        aria-label={`Ver ${unlockedCount} de ${totalAchievements} logros conseguidos`}
      >
        <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
        <span className="font-mono text-[11px] font-semibold">
          {unlockedCount}
          <span className="hidden sm:inline text-muted-foreground font-normal">
            /{totalAchievements}
          </span>
        </span>
      </Link>
    </div>
  );
}
