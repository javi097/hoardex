import { Plus, Check } from 'lucide-react';
import type { SearchResult } from '@/interfaces/provider.interface';
import { CoverImage } from '@/components/custom/CoverImage';
import { Button } from '@/components/ui/button';

export interface Props {
  result: SearchResult;
  onAdd: (result: SearchResult) => void;
  isAdded?: boolean;
}

export function SearchResultCard({ result, onAdd, isAdded = false }: Props) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-card p-2.5 transition-all hover:border-foreground/20 hover:bg-muted/30">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md shadow-2xs">
        <CoverImage
          src={result.coverUrl}
          alt={result.title}
          className="h-full w-full"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="font-heading text-sm font-semibold text-foreground line-clamp-1">
          {result.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {result.subtitle && (
            <span className="line-clamp-1">{result.subtitle}</span>
          )}
          {result.releaseYear && (
            <>
              {result.subtitle && <span>•</span>}
              <span className="shrink-0">{result.releaseYear}</span>
            </>
          )}
        </div>
      </div>

      <Button
        type="button"
        size="xs"
        variant={isAdded ? 'secondary' : 'default'}
        disabled={isAdded}
        onClick={() => onAdd(result)}
        className="shrink-0 gap-1"
      >
        {isAdded ? (
          <>
            <Check className="h-3 w-3" />
            <span>Añadido</span>
          </>
        ) : (
          <>
            <Plus className="h-3 w-3" />
            <span>Añadir</span>
          </>
        )}
      </Button>
    </div>
  );
}
