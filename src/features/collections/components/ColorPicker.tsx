import { Check, Pipette } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Props {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  { hex: '#6366f1', label: 'Índigo (Videojuegos)' },
  { hex: '#10b981', label: 'Esmeralda (Libros)' },
  { hex: '#f59e0b', label: 'Ámbar (Juegos de mesa)' },
  { hex: '#ec4899', label: 'Rosa (Figuras)' },
  { hex: '#14b8a6', label: 'Turquesa (Música)' },
  { hex: '#8b5cf6', label: 'Violeta (Personalizada)' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#84cc16', label: 'Lima' },
];

export function ColorPicker({ value, onChange, className }: Props) {
  const isCustomColor = !PRESET_COLORS.some(
    (c) => c.hex.toLowerCase() === value.toLowerCase()
  );

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_COLORS.map(({ hex, label }) => {
          const isSelected = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              title={label}
              aria-label={`Seleccionar color ${label}`}
              onClick={() => onChange(hex)}
              className={cn(
                'group relative flex h-7 w-7 items-center justify-center rounded-full transition-transform focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected ? 'scale-110 ring-2 ring-foreground/40' : 'hover:scale-105 opacity-90'
              )}
              style={{ backgroundColor: hex }}
            >
              {isSelected && (
                <Check className="h-3.5 w-3.5 text-white drop-shadow-xs" />
              )}
            </button>
          );
        })}

        {/* Selector personalizado */}
        <label
          title="Color personalizado"
          aria-label="Color personalizado"
          className={cn(
            'relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border transition-transform hover:scale-105 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            isCustomColor ? 'ring-2 ring-foreground/40' : 'bg-muted/40'
          )}
          style={{ backgroundColor: isCustomColor ? value : undefined }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <Pipette
            className={cn(
              'h-3.5 w-3.5',
              isCustomColor ? 'text-white drop-shadow-xs' : 'text-muted-foreground'
            )}
          />
        </label>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Color actual:</span>
        <span className="font-mono uppercase font-medium">{value}</span>
      </div>
    </div>
  );
}
