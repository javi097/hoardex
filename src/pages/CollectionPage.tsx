import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Plus, Trash2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/custom/Header';
import { EmptyState } from '@/components/custom/EmptyState';
import { ConfirmDialog } from '@/components/custom/ConfirmDialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { CollectionIcon } from '@/lib/icons';
import { ItemCard } from '@/features/items/components/ItemCard';
import { AddItemSheet } from '@/features/items/components/AddItemSheet';
import { cn } from '@/lib/utils';

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const collection = useCollectionsStore((state) =>
    state.collections.find((c) => c.id === id)
  );
  const removeCollection = useCollectionsStore(
    (state) => state.removeCollection
  );
  const items = useItemsStore((state) =>
    state.items.filter((item) => item.collectionId === id)
  );

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="container mx-auto max-w-4xl flex-1 px-4 py-16 flex items-center justify-center">
          <EmptyState
            title="Colección no encontrada"
            description="La colección que intentas ver no existe o fue eliminada."
            action={
              <Link
                to="/"
                className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al inicio</span>
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const completedCount = items.filter((item) => {
    const status = collection.statuses.find((s) => s.id === item.statusId);
    return item.xpAwarded || status?.isCompleted;
  }).length;

  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleDeleteCollection = () => {
    removeCollection(collection.id);
    toast.success(`Colección "${collection.name}" y sus ítems eliminados.`);
    navigate('/');
  };

  return (
    <div
      style={
        {
          '--collection-accent': collection.accentColor,
        } as React.CSSProperties
      }
      className="min-h-screen flex flex-col bg-background text-foreground"
    >
      <Header />

      <main className="container mx-auto max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* Barra superior de navegación y cabecera de colección */}
        <div className="flex flex-col gap-5 pb-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a colecciones</span>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Eliminar colección</span>
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ backgroundColor: collection.accentColor }}
              >
                <CollectionIcon name={collection.icon} className="h-7 w-7" />
              </div>

              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    {collection.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>
                    {totalCount} {totalCount === 1 ? 'ítem' : 'ítems'}
                  </span>
                  <span>•</span>
                  <span className="text-[var(--collection-accent)] font-semibold">
                    {completedCount} completados ({Math.round(progressPercent)}%)
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsAddSheetOpen(true)}
              className="self-start md:self-auto gap-2 bg-[var(--collection-accent)] text-white hover:opacity-90 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir ítem</span>
            </Button>
          </div>

          {/* Barra de progreso global */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-1">
            <div
              className="h-full bg-[var(--collection-accent)] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cuadrícula de ítems */}
        <div className="mt-8">
          {items.length === 0 ? (
            <EmptyState
              icon={<PackagePlus className="h-6 w-6 text-primary" />}
              title="Colección vacía"
              description="Añade tu primer ítem buscando en el catálogo simulado o mediante alta manual."
              action={
                <Button
                  type="button"
                  onClick={() => setIsAddSheetOpen(true)}
                  className="gap-2 mt-2 bg-[var(--collection-accent)] text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  <span>Añadir primer ítem</span>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  statuses={collection.statuses}
                  accentColor={collection.accentColor}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Sheet para añadir ítem */}
      <AddItemSheet
        collection={collection}
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
      />

      {/* Diálogo de confirmación para eliminar la colección */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={`¿Eliminar colección "${collection.name}"?`}
        description="Esta acción eliminará la colección completa y todos sus ítems asociados de forma permanente. No se puede deshacer."
        confirmLabel="Eliminar colección"
        destructive
        onConfirm={handleDeleteCollection}
      />
    </div>
  );
}
