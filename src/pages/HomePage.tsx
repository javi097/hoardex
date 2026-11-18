import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Header } from '@/components/custom/Header';
import { EmptyState } from '@/components/custom/EmptyState';
import { Button } from '@/components/ui/button';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { CollectionCard } from '@/features/collections/components/CollectionCard';
import { NewCollectionSheet } from '@/features/collections/components/NewCollectionSheet';

export function HomePage() {
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);

  const collections = useCollectionsStore((state) => state.collections);
  const items = useItemsStore((state) => state.items);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="container mx-auto max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* Encabezado y acción principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/50">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Mis Colecciones
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona tus aficiones, catálogos y progreso de forma centralizada.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsNewSheetOpen(true)}
            className="self-start sm:self-auto gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva colección</span>
          </Button>
        </div>

        {/* Cuadrícula o estado vacío */}
        <div className="mt-8">
          {collections.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6 text-primary" />}
              title="Aún no tienes colecciones"
              description="Empieza creando una colección desde una plantilla (videojuegos, libros, juegos de mesa...) o personalízala desde cero."
              action={
                <Button
                  type="button"
                  onClick={() => setIsNewSheetOpen(true)}
                  className="gap-2 mt-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear mi primera colección</span>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {collections.map((collection) => {
                const collectionItems = items.filter(
                  (item) => item.collectionId === collection.id
                );
                return (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    items={collectionItems}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Sheet para crear colección */}
      <NewCollectionSheet
        open={isNewSheetOpen}
        onOpenChange={setIsNewSheetOpen}
      />
    </div>
  );
}
