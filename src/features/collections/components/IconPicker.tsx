import { ICON_REGISTRY } from '@/lib/icons';
import { cn } from '@/lib/utils';

export interface Props {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: Props) {
  const iconKeys = Object.keys(ICON_REGISTRY);

  return (
    <div
      role="radiogroup"
      aria-label="Selector de icono de colección"
      className={cn(
        'grid grid-cols-6 sm:grid-cols-8 gap-2 p-1 max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-2',
        className
      )}
    >
      {iconKeys.map((iconName) => {
        const IconComponent = ICON_REGISTRY[iconName];
        const isSelected = value === iconName;

        return (
          <button
            key={iconName}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Icono ${iconName}`}
            onClick={() => onChange(iconName)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md border transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-transparent bg-background text-foreground/80'
            )}
          >
            <IconComponent className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
