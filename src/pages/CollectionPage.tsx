import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  PackagePlus,
  Pencil,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/custom/Header';
import { EmptyState } from '@/components/custom/EmptyState';
import { ConfirmDialog } from '@/components/custom/ConfirmDialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { CollectionIcon } from '@/lib/icons';
import { ItemCard } from '@/features/items/components/ItemCard';
import { AddItemSheet } from '@/features/items/components/AddItemSheet';
import { ItemDetailSheet } from '@/features/items/components/ItemDetailSheet';
import { EditCollectionSheet } from '@/features/collections/components/EditCollectionSheet';
import {
  ITEM_SORT_OPTIONS,
  filterAndSortItems,
} from '@/features/items/core/sorting';
import { cn } from '@/lib/utils';

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Estados de filtros y ordenación
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
  const [selectedSortId, setSelectedSortId] = useState<string>('createdAt-desc');

  const collections = useCollectionsStore((state) => state.collections);
  const collection = collections.find((c) => c.id === id);
  const removeCollection = useCollectionsStore(
    (state) => state.removeCollection
  );

  const allItems = useItemsStore((state) => state.items);
  const items = useMemo(
    () => allItems.filter((item) => item.collectionId === id),
    [allItems, id]
  );

  // Obtener ítem seleccionado actualizado en tiempo real desde el store
  const selectedItem = useMemo(
    () => allItems.find((i) => i.id === selectedItemId) ?? null,
    [allItems, selectedItemId]
  );

  const currentSort = useMemo(
    () =>
      ITEM_SORT_OPTIONS.find((s) => s.id === selectedSortId) ??
      ITEM_SORT_OPTIONS[0],
    [selectedSortId]
  );

  const filteredAndSortedItems = useMemo(() => {
    return filterAndSortItems(
      items,
      {
        query: searchQuery,
        statusId: selectedStatusId,
      },
      currentSort
    );
  }, [items, searchQuery, selectedStatusId, currentSort]);

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
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleDeleteCollection = () => {
    removeCollection(collection.id);
    toast.success(`Colección "${collection.name}" y sus ítems eliminados.`);
    navigate('/');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatusId('all');
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

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditSheetOpen(true)}
                className="text-xs gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Editar colección</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar</span>
              </Button>
            </div>
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

        {/* Barra de herramientas: búsqueda, filtros de estado y ordenación */}
        {items.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {/* Píldoras horizontales de estado con scroll táctil */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedStatusId('all')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                  selectedStatusId === 'all'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>Todos</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                    selectedStatusId === 'all'
                      ? 'bg-background/20 text-background'
                      : 'bg-background/80 text-foreground'
                  )}
                >
                  {items.length}
                </span>
              </button>

              {collection.statuses.map((st) => {
                const count = items.filter((it) => it.statusId === st.id).length;
                const isSelected = selectedStatusId === st.id;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatusId(st.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                      isSelected
                        ? 'text-white shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: collection.accentColor }
                        : undefined
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? '#ffffff'
                          : collection.accentColor,
                      }}
                    />
                    <span>{st.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-background/80 text-foreground'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fila de búsqueda por texto y selector de ordenación */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título o autor/subtítulo..."
                  className="pl-9 pr-8 h-9 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Mostrando {filteredAndSortedItems.length} de {items.length}{' '}
                  {items.length === 1 ? 'ítem' : 'ítems'}
                </span>

                <div className="w-44 sm:w-48 shrink-0">
                  <Select
                    value={selectedSortId}
                    onValueChange={setSelectedSortId}
                  >
                    <SelectTrigger
                      aria-label="Criterio de ordenación"
                      className="h-9 text-xs"
                    >
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {ITEM_SORT_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.id}
                          value={opt.id}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal: vacíos o cuadrícula */}
        <div className="mt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={<PackagePlus className="h-6 w-6 text-primary" />}
              title="Colección vacía"
              description="Añade tu primer ítem buscando en el catálogo de proveedores o mediante alta manual."
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
          ) : filteredAndSortedItems.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-6 w-6 text-muted-foreground" />}
              title="Sin resultados"
              description="No se encontraron ítems que coincidan con los filtros aplicados."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-2 mt-2"
                >
                  <span>Restablecer filtros</span>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredAndSortedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  statuses={collection.statuses}
                  accentColor={collection.accentColor}
                  onSelect={(clicked) => setSelectedItemId(clicked.id)}
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

      {/* Sheet para ver y editar detalle del ítem */}
      <ItemDetailSheet
        item={selectedItem}
        collection={collection}
        open={Boolean(selectedItemId)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedItemId(null);
        }}
        onDeleted={() => setSelectedItemId(null)}
      />

      {/* Sheet para editar colección */}
      <EditCollectionSheet
        collection={collection}
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
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
