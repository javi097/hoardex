import { Link } from 'react-router';
import { ChevronRight, Lock } from 'lucide-react';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import { CollectionIcon } from '@/lib/icons';
import { CoverImage } from '@/components/custom/CoverImage';
import { cn } from '@/lib/utils';

export interface Props {
  collection: Collection;
  items: Item[];
  className?: string;
}

export function CollectionCard({ collection, items, className }: Props) {
  // Ítems completados de la colección
  const completedCount = items.filter((item) => {
    // Es completado si xpAwarded es true o coincide con el status completado
    const status = collection.statuses.find((s) => s.id === item.statusId);
    return item.xpAwarded || status?.isCompleted;
  }).length;

  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Hasta 4 portadas recientes
  const recentCovers = items
    .filter((item) => Boolean(item.coverUrl))
    .slice(-4)
    .reverse();

  return (
    <Link
      to={`/collection/${collection.id}`}
      style={
        {
          '--collection-accent': collection.accentColor,
        } as React.CSSProperties
      }
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-left transition-all hover:border-[var(--collection-accent)] hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--collection-accent)] focus-visible:ring-offset-2',
        className
      )}
    >
      {/* Indicador de acento superior sutil */}
      <div
        className="absolute inset-x-0 top-0 h-1 bg-[var(--collection-accent)] opacity-85 transition-opacity group-hover:opacity-100"
      />

      <div>
        {/* Cabecera de la tarjeta */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-transform group-hover:scale-105"
            style={{ backgroundColor: collection.accentColor }}
          >
            <CollectionIcon name={collection.icon} className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            {collection.isPublic === false && (
              <span title="Colección privada" className="flex items-center">
                <Lock
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-label="Colección privada"
                  role="img"
                />
              </span>
            )}
            <span>
              {completedCount} / {totalCount}
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 text-muted-foreground" />
          </div>
        </div>

        {/* Título y descripción */}
        <div className="mt-3.5">
          <h3 className="font-heading text-lg font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-[var(--collection-accent)] transition-colors">
            {collection.name}
          </h3>
          {collection.description ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/60 italic">
              Sin descripción
            </p>
          )}
        </div>
      </div>

      {/* Miniaturas de portadas recientes y barra de progreso */}
      <div className="mt-4 pt-3 border-t border-border/50">
        {recentCovers.length > 0 ? (
          <div className="flex items-center gap-1.5 mb-3">
            {recentCovers.map((item) => (
              <div
                key={item.id}
                className="h-12 w-9 shrink-0 overflow-hidden rounded shadow-xs"
              >
                <CoverImage
                  src={item.coverUrl}
                  alt={item.title}
                  className="h-full w-full"
                />
              </div>
            ))}
            {totalCount > recentCovers.length && (
              <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-muted/60 text-[10px] font-semibold text-muted-foreground">
                +{totalCount - recentCovers.length}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-12 items-center text-xs text-muted-foreground/60 italic mb-3">
            Aún no hay ítems en esta colección
          </div>
        )}

        {/* Barra de progreso */}
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[var(--collection-accent)] transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
