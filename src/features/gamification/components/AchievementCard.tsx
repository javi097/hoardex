import type { ComponentType } from 'react';
import {
  PackagePlus,
  Layers,
  Archive,
  CheckCircle2,
  Trophy,
  PenTool,
  MessageSquareText,
  Boxes,
  Crown,
  Flame,
  Sparkles,
  Medal,
  Lock,
  type LucideProps,
} from 'lucide-react';
import type {
  Achievement,
  AchievementTier,
  UnlockedAchievement,
} from '@/interfaces/gamification.interface';
import { cn } from '@/lib/utils';

export interface Props {
  achievement: Achievement;
  unlockedInfo?: UnlockedAchievement;
  className?: string;
}

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  PackagePlus,
  Layers,
  Archive,
  CheckCircle2,
  Trophy,
  PenTool,
  MessageSquareText,
  Boxes,
  Crown,
  Flame,
  Sparkles,
  Medal,
};

const TIER_CONFIG: Record<
  AchievementTier,
  {
    label: string;
    badgeClass: string;
    cardBorderClass: string;
    iconBgClass: string;
    iconColorClass: string;
  }
> = {
  bronze: {
    label: 'Bronce',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/20',
    cardBorderClass: 'border-amber-700/30 hover:border-amber-600/50 bg-amber-500/5',
    iconBgClass: 'bg-amber-500/15',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
  },
  silver: {
    label: 'Plata',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20',
    cardBorderClass: 'border-slate-400/40 hover:border-slate-400/70 bg-slate-500/5',
    iconBgClass: 'bg-slate-500/15',
    iconColorClass: 'text-slate-600 dark:text-slate-300',
  },
  gold: {
    label: 'Oro',
    badgeClass: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    cardBorderClass: 'border-yellow-500/40 hover:border-yellow-500/70 bg-yellow-500/10',
    iconBgClass: 'bg-yellow-500/20',
    iconColorClass: 'text-yellow-600 dark:text-yellow-400',
  },
  platinum: {
    label: 'Platino',
    badgeClass: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    cardBorderClass: 'border-cyan-500/40 hover:border-cyan-400/70 bg-cyan-500/10',
    iconBgClass: 'bg-cyan-500/20',
    iconColorClass: 'text-cyan-600 dark:text-cyan-300',
  },
};

function formatUnlockDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function AchievementCard({
  achievement,
  unlockedInfo,
  className,
}: Props) {
  const isUnlocked = Boolean(unlockedInfo);
  const tierConfig = TIER_CONFIG[achievement.tier];
  const IconComponent = ICON_MAP[achievement.icon] ?? Trophy;

  return (
    <div
      role="article"
      aria-label={
        isUnlocked
          ? `Logro desbloqueado: ${achievement.title}`
          : `Logro bloqueado: ${achievement.title}`
      }
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all',
        isUnlocked
          ? tierConfig.cardBorderClass
          : 'border-border/60 bg-muted/20 opacity-80 hover:opacity-95',
        className
      )}
    >
      <div>
        {/* Cabecera de la tarjeta: Tier y Recompensa */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
              isUnlocked
                ? tierConfig.badgeClass
                : 'bg-muted text-muted-foreground border-border/40'
            )}
          >
            {tierConfig.label}
          </span>

          <span
            className={cn(
              'font-mono text-xs font-semibold',
              isUnlocked
                ? tierConfig.iconColorClass
                : 'text-muted-foreground'
            )}
          >
            +{achievement.xpReward} XP
          </span>
        </div>

        {/* Cuerpo: Icono y contenido */}
        <div className="mt-3.5 flex items-start gap-3.5">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300',
              isUnlocked
                ? cn(tierConfig.iconBgClass, tierConfig.iconColorClass)
                : 'bg-muted text-muted-foreground/60'
            )}
          >
            {isUnlocked ? (
              <IconComponent className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Lock className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h4
              className={cn(
                'font-heading text-sm font-bold leading-tight truncate',
                isUnlocked ? 'text-foreground' : 'text-foreground/75'
              )}
            >
              {achievement.title}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {achievement.description}
            </p>
          </div>
        </div>
      </div>

      {/* Pie de tarjeta: Estado de desbloqueo */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px]">
        {isUnlocked && unlockedInfo ? (
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 inline shrink-0" />
            <span>Desbloqueado: {formatUnlockDate(unlockedInfo.unlockedAt)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/70 italic flex items-center gap-1">
            <Lock className="h-3 w-3 inline shrink-0" />
            <span>Bloqueado</span>
          </span>
        )}
      </div>
    </div>
  );
}
