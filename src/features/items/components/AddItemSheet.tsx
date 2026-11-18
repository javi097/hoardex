import { useState } from 'react';
import { toast } from 'sonner';
import { Search, PenLine, Loader2 } from 'lucide-react';
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
import { mockProvider } from '@/providers/mock';
import {
  createItemFromSearchResult,
  createItemManual,
} from '@/features/items/core/items';
import { useItemsStore } from '@/features/items/store/items.store';
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
  const [tab, setTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const addItem = useItemsStore((state) => state.addItem);

  // El estado inicial del ítem es el primer estado ordenado de la colección
  const initialStatus =
    [...collection.statuses].sort((a, b) => a.order - b.order)[0] ??
    collection.statuses[0];

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await mockProvider.search(query);
      setSearchResults(results);
    } catch {
      toast.error('Ocurrió un error al buscar ítems');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSearchResult = (result: SearchResult) => {
    const newItem = createItemFromSearchResult({
      collectionId: collection.id,
      result,
      initialStatusId: initialStatus.id,
      now: new Date().toISOString(),
    });

    addItem(newItem);
    setAddedIds((prev) => new Set(prev).add(result.externalId));
    toast.success(`"${result.title}" añadido a ${collection.name}`);
    onAdded?.();
  };

  const handleManualSubmit = (data: {
    title: string;
    subtitle?: string;
    releaseYear?: number;
    coverUrl?: string;
  }) => {
    const newItem = createItemManual({
      collectionId: collection.id,
      title: data.title,
      subtitle: data.subtitle,
      releaseYear: data.releaseYear,
      coverUrl: data.coverUrl,
      initialStatusId: initialStatus.id,
      now: new Date().toISOString(),
    });

    addItem(newItem);
    toast.success(`"${newItem.title}" añadido a ${collection.name}`);
    onOpenChange(false);
    onAdded?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-xl">Añadir ítem</SheetTitle>
          <SheetDescription>
            Agrega nuevos elementos a la colección &ldquo;{collection.name}&rdquo;.
          </SheetDescription>

          {/* Toggle de pestañas Buscar / Manual */}
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
        </SheetHeader>

        {tab === 'search' ? (
          <div className="flex flex-col gap-4 py-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Estado de carga */}
            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Buscando coincidencias...</span>
              </div>
            )}

            {/* Resultados */}
            {!isSearching && hasSearched && searchResults.length > 0 && (
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
            {!isSearching && hasSearched && searchResults.length === 0 && (
              <EmptyState
                title="Sin resultados"
                description={`No encontramos nada para "${searchQuery}". Puedes intentar con otro término o darlo de alta manualmente.`}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTab('manual')}
                  >
                    Crear manualmente
                  </Button>
                }
              />
            )}

            {/* Pantalla previa a buscar */}
            {!isSearching && !hasSearched && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>Escribe el nombre de un título para simular la búsqueda.</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                  Prueba buscando: &ldquo;zelda&rdquo;, &ldquo;dune&rdquo;, &ldquo;pink floyd&rdquo;, o &ldquo;all&rdquo;.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            <ItemForm
              onSubmit={handleManualSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
