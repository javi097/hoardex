import { useState, type ComponentType } from 'react';
import {
  PackagePlus,
  CheckCircle2,
  Star,
  Layers,
  Trophy,
  Flame,
  Medal,
  Zap,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  type LucideProps,
} from 'lucide-react';
import type { XpActionType, XpEvent } from '@/interfaces/gamification.interface';
import { EmptyState } from '@/components/custom/EmptyState';
import { cn } from '@/lib/utils';

export interface Props {
  events: XpEvent[];
  className?: string;
}

interface ActionConfig {
  icon: ComponentType<LucideProps>;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}

const ACTION_CONFIG: Record<XpActionType, ActionConfig> = {
  add_item: {
    icon: PackagePlus,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600 dark:text-blue-400',
  },
  complete_item: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
  },
  rate_and_review: {
    icon: Star,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    badgeBg: 'bg-yellow-500/10',
    badgeText: 'text-yellow-600 dark:text-yellow-400',
  },
  create_collection: {
    icon: Layers,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-600 dark:text-purple-400',
  },
  complete_collection: {
    icon: Trophy,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
  },
  daily_streak: {
    icon: Flame,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-600 dark:text-orange-400',
  },
  achievement: {
    icon: Medal,
    iconBg: 'bg-fuchsia-500/10',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/10',
    badgeText: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  challenge: {
    icon: Zap,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-600 dark:text-cyan-400',
  },
};

const DEFAULT_CONFIG: ActionConfig = {
  icon: Sparkles,
  iconBg: 'bg-primary/10',
  iconColor: 'text-primary',
  badgeBg: 'bg-primary/10',
  badgeText: 'text-primary',
};

function formatEventDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function XpHistoryFeed({ events, className }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
        title="Sin actividad reciente"
        description="El historial registrará tu experiencia ganada conforme catalogues ítems, mantengas rachas y completes retos."
        className={className}
      />
    );
  }

  const limit = isExpanded ? 25 : 5;
  const visibleEvents = events.slice(0, limit);
  const hasMore = events.length > 5;

  return (
    <div className={cn('space-y-4', className)}>
      <ul
        role="feed"
        aria-label="Historial de experiencia y actividad"
        aria-busy="false"
        className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs"
      >
        {visibleEvents.map((event) => {
          const config = ACTION_CONFIG[event.action] ?? DEFAULT_CONFIG;
          const IconComp = config.icon;

          return (
            <li
              key={event.id}
              role="article"
              aria-label={`${event.description}: +${event.xpGained} XP`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    config.iconBg,
                    config.iconColor
                  )}
                >
                  <IconComp className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatEventDate(event.timestamp)}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center font-mono text-xs font-bold px-2.5 py-1 rounded-full border border-border/40',
                    config.badgeBg,
                    config.badgeText
                  )}
                >
                  +{event.xpGained} XP
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card hover:bg-muted py-2 px-4 text-xs font-medium text-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>Ver menos (primeros 5)</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>
                  Ver más actividad ({events.length > 25 ? 'hasta 25' : `todos los ${events.length}`})
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
