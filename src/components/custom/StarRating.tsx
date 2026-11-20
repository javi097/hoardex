import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Props {
  value?: number;
  onChange?: (value?: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

const GAPS = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1.5',
} as const;

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: Props) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starCount = 5;
  const stars = Array.from({ length: starCount }, (_, index) => index + 1);
  const effectiveValue = hoverValue ?? value ?? 0;

  if (readonly) {
    const accessibleLabel = value
      ? `Valoración: ${value} de ${starCount} estrella${value === 1 ? '' : 's'}`
      : 'Sin valoración';

    return (
      <div
        role="img"
        aria-label={accessibleLabel}
        className={cn('inline-flex items-center', GAPS[size], className)}
      >
        {stars.map((star) => {
          const isFilled = (value ?? 0) >= star;
          return (
            <Star
              key={star}
              aria-hidden="true"
              className={cn(
                SIZES[size],
                'transition-colors',
                isFilled
                  ? 'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300'
                  : 'fill-transparent text-muted-foreground/30'
              )}
            />
          );
        })}
      </div>
    );
  }

  const handleStarClick = (star: number) => {
    if (value === star) {
      onChange?.(undefined);
    } else {
      onChange?.(star);
    }
  };

  return (
    <div
      role="group"
      aria-label="Valoración por estrellas"
      className={cn('inline-flex items-center', GAPS[size], className)}
      onMouseLeave={() => setHoverValue(null)}
    >
      {stars.map((star) => {
        const isFilled = effectiveValue >= star;
        const isSelected = value === star;
        const starLabel = `Calificar con ${star} estrella${star === 1 ? '' : 's'}`;

        return (
          <button
            key={star}
            type="button"
            aria-label={starLabel}
            aria-pressed={isSelected}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => setHoverValue(star)}
            onFocus={() => setHoverValue(star)}
            onBlur={() => setHoverValue(null)}
            className="rounded-xs p-0.5 text-muted-foreground transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Star
              aria-hidden="true"
              className={cn(
                SIZES[size],
                'transition-colors',
                isFilled
                  ? 'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300'
                  : 'fill-transparent text-muted-foreground/30'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
