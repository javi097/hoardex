import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Props {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: 'portrait' | 'square' | 'video';
}

export function CoverImage({
  src,
  alt,
  className,
  aspectRatio = 'portrait',
}: Props) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(() =>
    src ? 'loading' : 'error'
  );

  if (src !== prevSrc) {
    setPrevSrc(src);
    setStatus(src ? 'loading' : 'error');
  }

  const aspectClass =
    aspectRatio === 'portrait'
      ? 'aspect-[2/3]'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : 'aspect-video';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted select-none',
        aspectClass,
        className
      )}
    >
      {status === 'loading' && (
        <div
          data-testid="cover-skeleton"
          className="absolute inset-0 animate-pulse bg-muted-foreground/15"
        />
      )}

      {status !== 'error' && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {status === 'error' && (
        <div
          data-testid="cover-placeholder"
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center text-muted-foreground/60"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/50">
            <ImageOff className="h-4 w-4" />
          </div>
          <span className="line-clamp-2 px-1 text-[11px] font-medium leading-tight">
            Sin imagen
          </span>
        </div>
      )}
    </div>
  );
}
