import { useState } from 'react';
import type {
  CollectionStatus,
  ProviderType,
} from '@/interfaces/collection.interface';
import type { CreateCollectionParams } from '@/features/collections/core/templates';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { StatusesEditor } from './StatusesEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface Props {
  initialValues?: Partial<CreateCollectionParams>;
  onSubmit: (params: CreateCollectionParams) => void;
  onCancel?: () => void;
  submitLabel?: string;
  hideProvider?: boolean;
}

const DEFAULT_STATUSES: CollectionStatus[] = [
  { id: 'st-0', label: 'Pendiente', isCompleted: false, order: 0 },
  { id: 'st-1', label: 'En curso', isCompleted: false, order: 1 },
  { id: 'st-2', label: 'Completado', isCompleted: true, order: 2 },
];

export function CollectionForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar colección',
  hideProvider = false,
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? ''
  );
  const [icon, setIcon] = useState(initialValues?.icon ?? 'Gamepad2');
  const [accentColor, setAccentColor] = useState(
    initialValues?.accentColor ?? '#6366f1'
  );
  const [provider, setProvider] = useState<ProviderType>(
    initialValues?.provider ?? 'manual'
  );
  const [statuses, setStatuses] = useState<CollectionStatus[]>(
    initialValues?.statuses ?? DEFAULT_STATUSES
  );
  const [isPublic, setIsPublic] = useState(initialValues?.isPublic ?? true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre de la colección es obligatorio.');
      return;
    }

    const completed = statuses.filter((s) => s.isCompleted);
    if (completed.length !== 1) {
      setError('Debes marcar exactamente un estado como completado.');
      return;
    }

    if (statuses.some((s) => !s.label.trim())) {
      setError('Todos los estados deben tener una etiqueta válida.');
      return;
    }

    setError(null);
    onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
      icon,
      accentColor,
      provider,
      statuses,
      isPublic,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="collection-name">Nombre de la colección *</Label>
        <Input
          id="collection-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="p. ej. Mis Videojuegos Favoritos"
          autoFocus
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="collection-desc">Descripción (opcional)</Label>
        <Input
          id="collection-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="p. ej. Catálogo personal de títulos jugados y pendientes"
        />
      </div>

      {/* Proveedor de búsqueda externa (oculto en modo edición) */}
      {!hideProvider && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collection-provider">Proveedor de búsqueda</Label>
          <Select
            value={provider}
            onValueChange={(val) => setProvider(val as ProviderType)}
          >
            <SelectTrigger id="collection-provider">
              <SelectValue placeholder="Selecciona un proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (sin proveedor externo)</SelectItem>
              <SelectItem value="rawg">RAWG (Videojuegos)</SelectItem>
              <SelectItem value="openLibrary">Open Library (Libros)</SelectItem>
              <SelectItem value="bgg">BoardGameGeek (Juegos de mesa)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Visibilidad de la colección */}
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="space-y-0.5 pr-2">
          <Label
            htmlFor="collection-public-switch"
            className="text-sm font-semibold cursor-pointer"
          >
            {isPublic ? 'Colección pública' : 'Colección privada'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? 'Visible para otros usuarios en tu perfil público.'
              : 'Solo visible para ti al iniciar sesión en tu cuenta.'}
          </p>
        </div>
        <button
          type="button"
          id="collection-public-switch"
          role="switch"
          aria-checked={isPublic}
          aria-label={
            isPublic
              ? 'Cambiar a colección privada'
              : 'Cambiar a colección pública'
          }
          onClick={() => setIsPublic(!isPublic)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isPublic ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
              isPublic ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>

      {/* Color de acento */}
      <div className="flex flex-col gap-1.5">
        <Label>Color de acento</Label>
        <ColorPicker value={accentColor} onChange={setAccentColor} />
      </div>

      {/* Selector de icono */}
      <div className="flex flex-col gap-1.5">
        <Label>Icono representativo</Label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {/* Editor de estados */}
      <StatusesEditor value={statuses} onChange={setStatuses} />

      {/* Botones de acción */}
      <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
