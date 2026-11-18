import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { CollectionStatus } from '@/interfaces/collection.interface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface Props {
  value: CollectionStatus[];
  onChange: (statuses: CollectionStatus[]) => void;
  className?: string;
}

export function StatusesEditor({ value, onChange, className }: Props) {
  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = value.map((st, i) =>
      i === index ? { ...st, label: newLabel } : st
    );
    onChange(updated);
  };

  const handleSetCompleted = (index: number) => {
    const updated = value.map((st, i) => ({
      ...st,
      isCompleted: i === index,
    }));
    onChange(updated);
  };

  const handleAddStatus = () => {
    const newStatus: CollectionStatus = {
      id: `status-${crypto.randomUUID().slice(0, 8)}`,
      label: 'Nuevo estado',
      isCompleted: false,
      order: value.length,
    };
    onChange([...value, newStatus]);
  };

  const handleRemoveStatus = (index: number) => {
    if (value.length <= 1) return;
    const removedStatus = value[index];
    let updated = value.filter((_, i) => i !== index);

    // Si se eliminó el estado que estaba completado, reasignar el completado al último estado restante
    if (removedStatus.isCompleted && updated.length > 0) {
      updated = updated.map((st, i) =>
        i === updated.length - 1 ? { ...st, isCompleted: true } : st
      );
    }

    // Reordenar
    updated = updated.map((st, i) => ({ ...st, order: i }));
    onChange(updated);
  };

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Estados del ciclo de vida (marca uno como completado ✓)
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleAddStatus}
          className="gap-1 text-xs"
        >
          <Plus className="h-3 w-3" />
          Añadir estado
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {value.map((status, index) => (
          <div
            key={status.id}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-1.5"
          >
            {/* Botón de marcar completado */}
            <button
              type="button"
              title={
                status.isCompleted
                  ? 'Estado que marca el ítem como completado'
                  : 'Marcar como estado completado'
              }
              aria-label={
                status.isCompleted
                  ? 'Estado completado actual'
                  : `Marcar ${status.label} como completado`
              }
              onClick={() => handleSetCompleted(index)}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
                status.isCompleted
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-muted-foreground/40 hover:text-muted-foreground'
              )}
            >
              <CheckCircle2
                className={cn(
                  'h-4 w-4',
                  status.isCompleted && 'stroke-[2.5]'
                )}
              />
            </button>

            {/* Input de etiqueta */}
            <Input
              value={status.label}
              onChange={(e) => handleLabelChange(index, e.target.value)}
              placeholder="Nombre del estado"
              className="h-8 text-xs bg-background"
            />

            {/* Botón eliminar */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={value.length <= 1}
              onClick={() => handleRemoveStatus(index)}
              title="Eliminar estado"
              aria-label={`Eliminar estado ${status.label}`}
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
