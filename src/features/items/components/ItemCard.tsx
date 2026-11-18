import { useState } from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/interfaces/item.interface';
import type { CollectionStatus } from '@/interfaces/collection.interface';
import { useItemsStore } from '@/features/items/store/items.store';
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
  className?: string;
}

export function ItemCard({ item, statuses, accentColor, className }: Props) {
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

    updateItemStatus(
      item.id,
      newStatusId,
      targetIsCompleted,
      new Date().toISOString()
    );

    if (targetIsCompleted) {
      toast.success(`¡"${item.title}" marcado como completado!`);
    } else {
      toast.info(`Estado de "${item.title}" actualizado a ${targetStatus?.label}`);
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

          {/* Botón discreto de eliminación en la esquina superior izquierda */}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setIsConfirmOpen(true)}
            aria-label={`Eliminar ítem ${item.title}`}
            className="absolute top-2 left-2 h-7 w-7 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Información del ítem */}
        <div className="mt-2.5 flex flex-1 flex-col justify-between">
          <div>
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

          {/* Selector de estado inline */}
          <div className="mt-3">
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
