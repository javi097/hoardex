import { toast } from 'sonner';
import type { Collection } from '@/interfaces/collection.interface';
import type { CreateCollectionParams } from '@/features/collections/core/templates';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { reconcileOrphanItems } from '@/features/collections/core/reconciliation';
import { CollectionForm } from './CollectionForm';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export interface Props {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (collectionId: string) => void;
}

export function EditCollectionSheet({
  collection,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const updateCollection = useCollectionsStore(
    (state) => state.updateCollection
  );

  const handleSubmit = (params: CreateCollectionParams) => {
    try {
      const now = new Date().toISOString();
      const currentItems = useItemsStore.getState().items;

      // 1. Reconciliación pura de ítems huérfanos si se eliminaron estados
      const { updatedItems, reassignedCount } = reconcileOrphanItems(
        currentItems,
        params.statuses,
        collection.id,
        now
      );

      if (reassignedCount > 0) {
        useItemsStore.getState().setItems(updatedItems);
        toast.info(
          `${reassignedCount} ítem${reassignedCount === 1 ? '' : 's'} reasignado${reassignedCount === 1 ? '' : 's'} automáticamente al primer estado.`
        );
      }

      // 2. Actualizar los datos de la colección en el store (preservando su provider)
      updateCollection(collection.id, {
        name: params.name,
        description: params.description,
        icon: params.icon,
        accentColor: params.accentColor,
        statuses: params.statuses,
      });

      toast.success(`Colección "${params.name}" actualizada con éxito.`);
      onOpenChange(false);
      onUpdated?.(collection.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al actualizar la colección'
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Editar colección</SheetTitle>
          <SheetDescription>
            Modifica el nombre, descripción, aspecto o estados de tu colección.
          </SheetDescription>
        </SheetHeader>

        {open && (
          <CollectionForm
            key={`${collection.id}-${collection.name}`}
            initialValues={{
              name: collection.name,
              description: collection.description,
              icon: collection.icon,
              accentColor: collection.accentColor,
              provider: collection.provider,
              statuses: collection.statuses,
            }}
            hideProvider={true}
            submitLabel="Guardar cambios"
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
