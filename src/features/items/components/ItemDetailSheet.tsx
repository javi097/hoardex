import { useState } from 'react';
import { Calendar, Clock, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/interfaces/item.interface';
import type { Collection } from '@/interfaces/collection.interface';
import { useItemsStore } from '@/features/items/store/items.store';
import { CoverImage } from '@/components/custom/CoverImage';
import { StarRating } from '@/components/custom/StarRating';
import { ConfirmDialog } from '@/components/custom/ConfirmDialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface Props {
  item: Item | null;
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (itemId: string) => void;
}

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

interface ItemDetailContentProps {
  item: Item;
  collection: Collection;
  onClose: () => void;
  onDeleted?: (itemId: string) => void;
}

function ItemDetailContent({
  item,
  collection,
  onClose,
  onDeleted,
}: ItemDetailContentProps) {
  // Suscribirse a la versión más actualizada del ítem en el store
  const liveItem =
    useItemsStore((state) => state.items.find((i) => i.id === item.id)) ?? item;

  const updateItem = useItemsStore((state) => state.updateItem);
  const updateItemStatus = useItemsStore((state) => state.updateItemStatus);
  const removeItem = useItemsStore((state) => state.removeItem);

  // Inicialización directa mediante key-based remount (cero useEffect)
  const [rating, setRating] = useState<number | undefined>(liveItem.rating);
  const [notes, setNotes] = useState<string>(liveItem.notes ?? '');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const currentStatus =
    collection.statuses.find((s) => s.id === liveItem.statusId) ??
    collection.statuses[0];

  const isCompleted = liveItem.xpAwarded || currentStatus?.isCompleted;

  const handleStatusChange = (newStatusId: string) => {
    const targetStatus = collection.statuses.find((s) => s.id === newStatusId);
    const targetIsCompleted = Boolean(targetStatus?.isCompleted);

    updateItemStatus(
      liveItem.id,
      newStatusId,
      targetIsCompleted,
      new Date().toISOString()
    );

    if (targetIsCompleted) {
      toast.success(`¡"${liveItem.title}" marcado como completado!`);
    } else {
      toast.info(`Estado actualizado a ${targetStatus?.label ?? newStatusId}`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    updateItem(
      liveItem.id,
      {
        rating,
        notes: notes.trim() ? notes.trim() : undefined,
      },
      now
    );
    toast.success('Detalles del ítem guardados con éxito.');
  };

  const handleDelete = () => {
    removeItem(liveItem.id);
    toast.success(`"${liveItem.title}" eliminado de la colección`);
    onDeleted?.(liveItem.id);
    onClose();
  };

  return (
    <>
      <div className="flex flex-col gap-6 py-4">
        {/* Encabezado con carátula y títulos */}
        <div className="flex items-start gap-4">
          <div className="w-28 sm:w-32 shrink-0 overflow-hidden rounded-lg border border-border/70 shadow-sm bg-muted">
            <CoverImage
              src={liveItem.coverUrl}
              alt={liveItem.title}
              aspectRatio="portrait"
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1 gap-1">
            <SheetTitle className="text-xl font-bold leading-tight text-foreground break-words">
              {liveItem.title}
            </SheetTitle>
            {liveItem.subtitle && (
              <SheetDescription className="text-sm font-medium text-muted-foreground break-words">
                {liveItem.subtitle}
              </SheetDescription>
            )}
            {liveItem.releaseYear && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Año: {liveItem.releaseYear}</span>
              </div>
            )}
            {isCompleted && (
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white w-fit shadow-xs"
                style={{ backgroundColor: collection.accentColor }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Completado</span>
              </div>
            )}
          </div>
        </div>

        {/* Formulario de edición */}
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Selector de estado */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-status">Estado en la colección</Label>
            <Select
              value={currentStatus?.id ?? collection.statuses[0]?.id}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="item-status">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {collection.statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: collection.accentColor }}
                      />
                      <span>{status.label}</span>
                      {status.isCompleted && (
                        <span className="text-[11px] text-muted-foreground">
                          (Completado)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valoración por estrellas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Valoración personal</Label>
              <span className="text-xs text-muted-foreground">
                {rating ? `${rating} de 5 estrellas` : 'Sin calificar'}
              </span>
            </div>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Notas y reseña personal */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-notes">Notas o reseña personal</Label>
            <Textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe tus impresiones, notas o reseña personal sobre este ítem..."
              rows={4}
              className="resize-y"
            />
          </div>

          {/* Botón guardar cambios */}
          <Button type="submit" className="w-full gap-2">
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        </form>

        {/* Metadatos adicionales */}
        {liveItem.meta && Object.keys(liveItem.meta).length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Información adicional
            </span>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(liveItem.meta).map(([key, val]) => (
                <div key={key} className="flex flex-col">
                  <dt className="text-muted-foreground capitalize font-medium">
                    {key}
                  </dt>
                  <dd className="font-medium text-foreground break-words">
                    {String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Fechas de registro y actualización */}
        <div className="flex flex-col gap-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Añadido:
            </span>
            <span>{formatDate(liveItem.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Última actualización:
            </span>
            <span>{formatDate(liveItem.updatedAt)}</span>
          </div>
        </div>

        {/* Botón destructivo de eliminación */}
        <div className="border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 text-xs"
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar ítem de la colección
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={`¿Eliminar "${liveItem.title}"?`}
        description="Esta acción no se puede deshacer. El ítem y su valoración se eliminarán permanentemente de la colección."
        confirmLabel="Eliminar ítem"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

export function ItemDetailSheet({
  item,
  collection,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalle del ítem</SheetTitle>
          <SheetDescription>
            Consulta y edita los detalles, valoración y notas de este ítem.
          </SheetDescription>
        </SheetHeader>
        {item && (
          <ItemDetailContent
            key={item.id}
            item={item}
            collection={collection}
            onClose={() => onOpenChange(false)}
            onDeleted={onDeleted}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
