import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  COLLECTION_TEMPLATES,
  createCollection,
  type CreateCollectionParams,
} from '@/features/collections/core/templates';
import type { CollectionTemplate } from '@/interfaces/collection.interface';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { CollectionForm } from './CollectionForm';
import { CollectionIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { notifyGamificationResult } from '@/features/gamification/core/notifications';

export interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (collectionId: string) => void;
}

export function NewCollectionSheet({ open, onOpenChange, onCreated }: Props) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<CollectionTemplate | null>(null);

  const addCollection = useCollectionsStore((state) => state.addCollection);

  const handleSelectTemplate = (template: CollectionTemplate) => {
    setSelectedTemplate(template);
  };

  const handleResetStep = () => {
    setSelectedTemplate(null);
  };

  const handleSubmit = (params: CreateCollectionParams) => {
    try {
      const now = new Date().toISOString();
      const newCollection = createCollection(params, now);
      addCollection(newCollection);
      toast.success(`Colección "${newCollection.name}" creada con éxito.`);

      // Gamificación: registrar acción de crear colección
      const today = now.slice(0, 10);
      const updatedCollections = useCollectionsStore.getState().collections;
      const currentItems = useItemsStore.getState().items;

      const gamificationResult = useGamificationStore.getState().handleUserAction({
        action: 'create_collection',
        description: `Creación de colección: ${newCollection.name}`,
        targetId: newCollection.id,
        today,
        now,
        collections: updatedCollections,
        items: currentItems,
      });
      notifyGamificationResult(gamificationResult);

      onOpenChange(false);
      handleResetStep();
      onCreated?.(newCollection.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al crear la colección'
      );
    }
  };

  const isFormActive = Boolean(selectedTemplate);

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          handleResetStep();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            {isFormActive && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleResetStep}
                aria-label="Volver a selección de plantillas"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <SheetTitle className="text-xl">
                {isFormActive ? 'Personalizar colección' : 'Nueva colección'}
              </SheetTitle>
              <SheetDescription>
                {isFormActive
                  ? 'Ajusta los detalles antes de crear tu colección.'
                  : 'Elige una plantilla rápida o empieza una desde cero.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {!isFormActive ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLLECTION_TEMPLATES.map((tmpl) => {
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="flex flex-col text-left gap-2 p-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-all hover:scale-[1.02] hover:border-foreground/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    style={
                      {
                        '--collection-accent': tmpl.accentColor,
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-xs"
                        style={{ backgroundColor: tmpl.accentColor }}
                      >
                        <CollectionIcon name={tmpl.icon} className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {tmpl.defaultStatuses.length} estados
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-2">
            <CollectionForm
              initialValues={
                selectedTemplate
                  ? {
                      name: selectedTemplate.name,
                      description: selectedTemplate.description,
                      icon: selectedTemplate.icon,
                      accentColor: selectedTemplate.accentColor,
                      provider: selectedTemplate.provider,
                      statuses: selectedTemplate.defaultStatuses,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              submitLabel="Crear colección"
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
