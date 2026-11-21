import type { ComponentType } from 'react';
import {
  PackagePlus,
  CheckCircle2,
  PenTool,
  Layers,
  Star,
  Flame,
  Zap,
  Sparkles,
  Trophy,
  type LucideProps,
} from 'lucide-react';
import type { ChallengeProgress } from '@/interfaces/gamification.interface';
import { cn } from '@/lib/utils';

export interface Props {
  progress: ChallengeProgress;
  onClaim?: (progress: ChallengeProgress) => void;
  className?: string;
}

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  PackagePlus,
  CheckCircle2,
  PenTool,
  Layers,
  Star,
  Flame,
  Zap,
  Sparkles,
  Trophy,
};

export function ChallengeCard({ progress, onClaim, className }: Props) {
  const IconComponent = ICON_MAP[progress.icon] ?? Sparkles;
  const isWeekly = progress.category === 'weekly';

  return (
    <article
      role="article"
      aria-label={`${isWeekly ? 'Reto semanal' : 'Reto de hito'}: ${progress.title}`}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200',
        progress.isClaimed
          ? 'border-border/40 bg-card/60 opacity-85'
          : progress.isCompleted
            ? 'border-amber-500/50 bg-amber-500/5 shadow-xs shadow-amber-500/5'
            : 'border-border/70 bg-card hover:border-border hover:shadow-xs',
        className
      )}
    >
      <div>
        {/* Cabecera de la tarjeta: Categoría y Recompensa */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider border',
              isWeekly
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
            )}
          >
            {isWeekly ? 'Semanal' : 'Hito'}
          </span>

          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            +{progress.xpReward} XP
          </span>
        </div>

        {/* Título, descripción e icono */}
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              progress.isClaimed
                ? 'bg-muted text-muted-foreground'
                : progress.isCompleted
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-primary/10 text-primary ring-1 ring-primary/20'
            )}
          >
            <IconComponent className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-base font-semibold tracking-tight text-foreground line-clamp-1">
              {progress.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {progress.description}
            </p>
          </div>
        </div>
      </div>

      {/* Sección inferior: Progreso y Botón de acción */}
      <div className="mt-5 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-muted-foreground">Progreso</span>
          <span className="font-mono text-foreground font-semibold">
            {progress.current} / {progress.target} ({progress.percentage}%)
          </span>
        </div>

        {/* Barra de progreso */}
        <div
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso del reto ${progress.title}: ${progress.percentage}%`}
          className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40"
        >
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              progress.isClaimed
                ? 'bg-muted-foreground/40'
                : progress.isCompleted
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-primary'
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Botón de acción */}
        <div className="mt-3.5">
          {progress.isClaimed ? (
            <button
              type="button"
              disabled
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/50 py-2 px-3 text-xs font-medium text-muted-foreground cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Reclamado</span>
            </button>
          ) : progress.isCompleted ? (
            <button
              type="button"
              onClick={() => onClaim?.(progress)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 px-3 text-xs shadow-xs hover:shadow-md hover:shadow-amber-500/10 active:scale-[0.99] transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer animate-pulse duration-1000"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Reclamar (+{progress.xpReward} XP)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card py-2 px-3 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-80"
            >
              <span>{progress.current} / {progress.target}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
