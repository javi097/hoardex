import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, PenLine, Loader2, AlertCircle } from 'lucide-react';
import type { Collection } from '@/interfaces/collection.interface';
import type { SearchResult } from '@/interfaces/provider.interface';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/custom/EmptyState';
import { SearchResultCard } from './SearchResultCard';
import { ItemForm } from './ItemForm';
import { getSearchProvider } from '@/providers';
import {
  createItemFromSearchResult,
  createItemManual,
} from '@/features/items/core/items';
import { useItemsStore } from '@/features/items/store/items.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { notifyGamificationResult } from '@/features/gamification/core/notifications';
import { cn } from '@/lib/utils';

export interface Props {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}

export function AddItemSheet({
  collection,
  open,
  onOpenChange,
  onAdded,
}: Props) {
  const isManualCollection = collection.provider === 'manual';

  const [tab, setTab] = useState<'search' | 'manual'>(
    isManualCollection ? 'manual' : 'search'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addItem = useItemsStore((state) => state.addItem);

  // El estado inicial del ítem es el primer estado ordenado de la colección
  const initialStatus =
    [...collection.statuses].sort((a, b) => a.order - b.order)[0] ??
    collection.statuses[0];

  // Limpieza de timers y controladores al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortControllerRef.current?.abort();
      setSearchQuery('');
      setManualTitle('');
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
      setError(null);
      setTab(isManualCollection ? 'manual' : 'search');
    }
    onOpenChange(nextOpen);
  };

  const executeSearch = useCallback(
    async (queryToSearch: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setHasSearched(true);
      setError(null);

      try {
        const provider = getSearchProvider(collection.provider);
        const results = await provider.search(queryToSearch, {
          signal: controller.signal,
        });

        if (abortControllerRef.current === controller) {
          setSearchResults(results);
        }
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          err.name === 'AbortError'
        ) {
          return;
        }

        if (abortControllerRef.current === controller) {
          const message =
            err instanceof Error
              ? err.message
              : 'Ocurrió un error al buscar ítems en el catálogo.';
          setError(message);
          setSearchResults([]);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSearching(false);
        }
      }
    },
    [collection.provider]
  );

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = value.trim();
    if (!clean) {
      abortControllerRef.current?.abort();
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    // Debounce de 350 ms para tecleo continuo
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(clean);
    }, 350);
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    executeSearch(clean);
  };

  const handleAddSearchResult = (result: SearchResult) => {
    const now = new Date().toISOString();
    const isCompleted = Boolean(initialStatus?.isCompleted);
    const baseItem = createItemFromSearchResult({
      collectionId: collection.id,
      result,
      initialStatusId: initialStatus.id,
      now,
    });
    const newItem = {
      ...baseItem,
      xpAwarded: isCompleted,
    };

    addItem(newItem);
    setAddedIds((prev) => new Set(prev).add(result.externalId));
    toast.success(`"${result.title}" añadido a ${collection.name}`);

    // Gamificación: registrar adición de ítem
    const today = now.slice(0, 10);
    const currentCollections = useCollectionsStore.getState().collections;
    const updatedItems = useItemsStore.getState().items;

    const addResult = useGamificationStore.getState().handleUserAction({
      action: 'add_item',
      description: `Ítem añadido: ${newItem.title}`,
      targetId: newItem.id,
      today,
      now,
      collections: currentCollections,
      items: updatedItems,
    });
    notifyGamificationResult(addResult);

    // Si se añade directamente en un estado completado, otorgar XP de completado
    if (isCompleted) {
      const completeResult = useGamificationStore.getState().handleUserAction({
        action: 'complete_item',
        description: `Ítem completado al añadir: ${newItem.title}`,
        targetId: newItem.id,
        today,
        now,
        collections: currentCollections,
        items: updatedItems,
      });
      notifyGamificationResult(completeResult);
    }

    onAdded?.();
  };

  const handleManualSubmit = (data: {
    title: string;
    subtitle?: string;
    releaseYear?: number;
    coverUrl?: string;
  }) => {
    const now = new Date().toISOString();
    const isCompleted = Boolean(initialStatus?.isCompleted);
    const baseItem = createItemManual({
      collectionId: collection.id,
      title: data.title,
      subtitle: data.subtitle,
      releaseYear: data.releaseYear,
      coverUrl: data.coverUrl,
      initialStatusId: initialStatus.id,
      now,
    });
    const newItem = {
      ...baseItem,
      xpAwarded: isCompleted,
    };

    addItem(newItem);
    toast.success(`"${newItem.title}" añadido a ${collection.name}`);

    // Gamificación: registrar adición de ítem
    const today = now.slice(0, 10);
    const currentCollections = useCollectionsStore.getState().collections;
    const updatedItems = useItemsStore.getState().items;

    const addResult = useGamificationStore.getState().handleUserAction({
      action: 'add_item',
      description: `Ítem añadido: ${newItem.title}`,
      targetId: newItem.id,
      today,
      now,
      collections: currentCollections,
      items: updatedItems,
    });
    notifyGamificationResult(addResult);

    // Si se añade directamente en un estado completado, otorgar XP de completado
    if (isCompleted) {
      const completeResult = useGamificationStore.getState().handleUserAction({
        action: 'complete_item',
        description: `Ítem completado al añadir: ${newItem.title}`,
        targetId: newItem.id,
        today,
        now,
        collections: currentCollections,
        items: updatedItems,
      });
      notifyGamificationResult(completeResult);
    }

    onOpenChange(false);
    onAdded?.();
  };

  const getProviderDescription = () => {
    switch (collection.provider) {
      case 'rawg':
        return 'Busca videojuegos por título en la base de datos de RAWG.';
      case 'openLibrary':
        return 'Busca libros por título o autor en Open Library.';
      case 'bgg':
        return 'Busca juegos de mesa por título en BoardGameGeek.';
      default:
        return 'Escribe el nombre de un título para buscar en el catálogo.';
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-xl">Añadir ítem</SheetTitle>
          <SheetDescription>
            {isManualCollection
              ? `Agrega nuevos elementos a la colección "${collection.name}" de forma manual.`
              : `Agrega nuevos elementos a la colección "${collection.name}".`}
          </SheetDescription>

          {/* Toggle de pestañas Buscar / Manual (sólo visible si la colección tiene proveedor de búsqueda) */}
          {!isManualCollection && (
            <div className="mt-3 flex rounded-lg border border-border/60 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setTab('search')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
                  tab === 'search'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar en catálogo</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('manual')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
                  tab === 'manual'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <PenLine className="h-3.5 w-3.5" />
                <span>Alta manual</span>
              </button>
            </div>
          )}
        </SheetHeader>

        {!isManualCollection && tab === 'search' ? (
          <div className="flex flex-col gap-4 py-2">
            <form onSubmit={handleManualSearchSubmit} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Buscar por título, autor o medio..."
                className="h-9"
                autoFocus
              />
              <Button type="submit" disabled={isSearching} className="gap-1.5">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>Buscar</span>
              </Button>
            </form>

            {/* Banner visual accesible de error */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="flex-1 text-xs leading-relaxed">
                    <p className="font-semibold">
                      No se pudo completar la búsqueda
                    </p>
                    <p className="mt-0.5 text-destructive/90">{error}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setManualTitle(searchQuery.trim());
                      setTab('manual');
                    }}
                    className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/20 hover:text-destructive"
                  >
                    Dar de alta manualmente
                  </Button>
                </div>
              </div>
            )}

            {/* Estado de carga */}
            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Buscando coincidencias...</span>
              </div>
            )}

            {/* Resultados */}
            {!isSearching &&
              !error &&
              hasSearched &&
              searchResults.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} resultados encontrados:
                  </span>
                  {searchResults.map((result) => (
                    <SearchResultCard
                      key={result.externalId}
                      result={result}
                      isAdded={addedIds.has(result.externalId)}
                      onAdd={handleAddSearchResult}
                    />
                  ))}
                </div>
              )}

            {/* Sin resultados */}
            {!isSearching &&
              !error &&
              hasSearched &&
              searchResults.length === 0 && (
                <EmptyState
                  title="Sin resultados"
                  description={`No encontramos nada para "${searchQuery}". Puedes intentar con otro término o darlo de alta manualmente.`}
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManualTitle(searchQuery.trim());
                        setTab('manual');
                      }}
                    >
                      Crear manualmente
                    </Button>
                  }
                />
              )}

            {/* Pantalla previa a buscar */}
            {!isSearching && !hasSearched && !error && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>{getProviderDescription()}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                  Comienza a escribir para ver sugerencias en tiempo real.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            <ItemForm
              key={manualTitle || 'default-manual-form'}
              defaultTitle={manualTitle}
              onSubmit={handleManualSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
