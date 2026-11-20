import { useState } from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/interfaces/item.interface';
import type { CollectionStatus } from '@/interfaces/collection.interface';
import { useItemsStore } from '@/features/items/store/items.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { notifyGamificationResult } from '@/features/gamification/core/notifications';
import { CoverImage } from '@/components/custom/CoverImage';
import { ConfirmDialog } from '@/components/custom/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface Props {
  item: Item;
  statuses: CollectionStatus[];
  accentColor: string;
  onSelect?: (item: Item) => void;
  className?: string;
}

export function ItemCard({
  item,
  statuses,
  accentColor,
  onSelect,
  className,
}: Props) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const updateItemStatus = useItemsStore((state) => state.updateItemStatus);
  const removeItem = useItemsStore((state) => state.removeItem);

  // Estado actual del ítem
  const currentStatus =
    statuses.find((s) => s.id === item.statusId) ?? statuses[0];

  const isCompleted = item.xpAwarded || currentStatus?.isCompleted;

  const handleStatusChange = (newStatusId: string) => {
    const targetStatus = statuses.find((s) => s.id === newStatusId);
    const targetIsCompleted = Boolean(targetStatus?.isCompleted);
    const shouldAwardXp = targetIsCompleted && !item.xpAwarded;
    const now = new Date().toISOString();

    updateItemStatus(
      item.id,
      newStatusId,
      targetIsCompleted,
      now
    );

    if (targetIsCompleted) {
      toast.success(`¡"${item.title}" marcado como completado!`);
    } else {
      toast.info(`Estado de "${item.title}" actualizado a ${targetStatus?.label}`);
    }

    if (shouldAwardXp) {
      const today = now.slice(0, 10);
      const currentCollections = useCollectionsStore.getState().collections;
      const updatedItems = useItemsStore.getState().items;

      const gamificationResult = useGamificationStore.getState().handleUserAction({
        action: 'complete_item',
        description: `Ítem completado: ${item.title}`,
        targetId: item.id,
        today,
        now,
        collections: currentCollections,
        items: updatedItems,
      });
      notifyGamificationResult(gamificationResult);
    }
  };

  const handleDelete = () => {
    removeItem(item.id);
    toast.success(`"${item.title}" eliminado`);
  };

  return (
    <>
      <div
        style={
          {
            '--collection-accent': accentColor,
          } as React.CSSProperties
        }
        className={cn(
          'group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card p-2.5 transition-all hover:border-[var(--collection-accent)]/60 hover:shadow-md',
          isCompleted && 'border-[var(--collection-accent)]/50 bg-[var(--collection-accent)]/5',
          className
        )}
      >
        {/* Disparador accesible para abrir el detalle del ítem */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect?.(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect?.(item);
            }
          }}
          aria-label={`Ver detalles de ${item.title}`}
          className="cursor-pointer flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        >
          {/* Carátula y badges */}
          <div className="relative">
            <div className="overflow-hidden rounded-lg shadow-2xs">
              <CoverImage
                src={item.coverUrl}
                alt={item.title}
                aspectRatio="portrait"
                className="w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>

            {/* Badge de completado sobre la carátula */}
            {isCompleted && (
              <div
                className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs"
                style={{ backgroundColor: accentColor }}
              >
                <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                <span>Completado</span>
              </div>
            )}

            {/* Distintivo compacto de valoración (p. ej. ★ 4) */}
            {typeof item.rating === 'number' && (
              <div
                aria-label={`Valoración: ${item.rating} de 5 estrellas`}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 shadow-xs backdrop-blur-xs"
              >
                <span className="text-amber-400">★</span>
                <span>{item.rating}</span>
              </div>
            )}
          </div>

          {/* Información del ítem */}
          <div className="mt-2.5 flex flex-1 flex-col justify-start">
            <h4
              title={item.title}
              className="font-heading text-sm font-semibold text-foreground line-clamp-1 leading-snug group-hover:text-[var(--collection-accent)] transition-colors"
            >
              {item.title}
            </h4>

            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground line-clamp-1">
              {item.subtitle && <span>{item.subtitle}</span>}
              {item.releaseYear && (
                <>
                  {item.subtitle && <span>•</span>}
                  <span>{item.releaseYear}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botón flotante de eliminación: fuera de role="button", aislado */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmOpen(true);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Eliminar ítem ${item.title}`}
          className="absolute top-4 left-4 h-7 w-7 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 shadow-xs z-10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        {/* Selector de estado inline: fuera de role="button", aislado */}
        <div
          className="mt-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Select
            value={item.statusId}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger
              aria-label={`Estado actual de ${item.title}`}
              className="h-7 text-xs bg-muted/40 hover:bg-muted/70 border-border/60"
            >
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((st) => (
                <SelectItem key={st.id} value={st.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {st.isCompleted && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                    <span>{st.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="¿Eliminar ítem?"
        description={`Se eliminará "${item.title}" de esta colección. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
