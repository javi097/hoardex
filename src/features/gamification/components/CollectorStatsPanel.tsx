import { CheckCircle2, Star, Layers, MessageSquareText } from 'lucide-react';
import type { CollectorStats } from '@/interfaces/gamification.interface';
import { StarRating } from '@/components/custom/StarRating';
import { cn } from '@/lib/utils';

export interface Props {
  stats: CollectorStats;
  className?: string;
}

export function CollectorStatsPanel({ stats, className }: Props) {
  return (
    <section
      aria-label="Estadísticas cuantitativas del coleccionista"
      className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}
    >
      {/* 1. Tasa de completado */}
      <article
        role="article"
        aria-label={`Tasa de completado: ${stats.completionRate}%`}
        className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completado
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-extrabold text-foreground">
              {stats.completionRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.completedItems} de {stats.totalItems}{' '}
            {stats.totalItems === 1 ? 'ítem completado' : 'ítems completados'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border/40">
          <div
            role="progressbar"
            aria-valuenow={stats.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Porcentaje completado: ${stats.completionRate}%`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border/30"
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </article>

      {/* 2. Valoración media */}
      <article
        role="article"
        aria-label={
          stats.ratedItemsCount > 0
            ? `Valoración media: ${stats.averageRating} estrellas`
            : 'Sin valoraciones aún'
        }
        className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nota media
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Star className="h-4 w-4 fill-amber-500/20 text-amber-500" aria-hidden="true" />
          </div>
        </div>

        <div>
          {stats.ratedItemsCount > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-foreground">
                  {stats.averageRating.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-muted-foreground">/ 5.0</span>
              </div>
              <div className="mt-2">
                <StarRating
                  value={Math.round(stats.averageRating)}
                  readonly
                  size="sm"
                />
              </div>
            </>
          ) : (
            <div>
              <p className="font-heading text-lg font-bold text-foreground">
                Sin valoraciones aún
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Puntúa tus ejemplares con estrellas
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          {stats.ratedItemsCount > 0 ? (
            <span>
              {stats.ratedItemsCount}{' '}
              {stats.ratedItemsCount === 1 ? 'ítem valorado' : 'ítems valorados'}
            </span>
          ) : (
            <span>0 valoraciones</span>
          )}
        </div>
      </article>

      {/* 3. Colección destacada */}
      <article
        role="article"
        aria-label={
          stats.mostActiveCollection
            ? `Colección destacada: ${stats.mostActiveCollection.name}`
            : 'Sin colecciones destacadas'
        }
        className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Colección activa
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div>
          {stats.mostActiveCollection ? (
            <>
              <h4 className="font-heading text-xl font-bold text-foreground truncate">
                {stats.mostActiveCollection.name}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.mostActiveCollection.itemCount}{' '}
                {stats.mostActiveCollection.itemCount === 1 ? 'ítem' : 'ítems'} catalogados
              </p>
            </>
          ) : (
            <div>
              <p className="font-heading text-lg font-bold text-foreground">
                Sin colecciones
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea una colección para ver métricas
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          {stats.mostActiveCollection ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {stats.mostActiveCollection.completedCount} completados
            </span>
          ) : (
            <span>Catálogo vacío</span>
          )}
        </div>
      </article>

      {/* 4. Reseñas y notas redactadas */}
      <article
        role="article"
        aria-label={`Reseñas y reflexiones: ${stats.reviewedItemsCount}`}
        className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cuaderno de notas
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div>
          <span className="font-mono text-3xl font-extrabold text-foreground">
            {stats.reviewedItemsCount}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.reviewedItemsCount === 1 ? 'reseña redactada' : 'reseñas redactadas'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          <span>
            En {stats.totalCollections}{' '}
            {stats.totalCollections === 1 ? 'colección' : 'colecciones'}
          </span>
        </div>
      </article>
    </section>
  );
}
