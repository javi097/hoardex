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
