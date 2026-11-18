import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface Props {
  defaultTitle?: string;
  onSubmit: (data: {
    title: string;
    subtitle?: string;
    releaseYear?: number;
    coverUrl?: string;
  }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ItemForm({
  defaultTitle = '',
  onSubmit,
  onCancel,
  submitLabel = 'Añadir ítem',
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('El título del ítem es obligatorio.');
      return;
    }

    const yearNum = releaseYear ? parseInt(releaseYear, 10) : undefined;
    if (releaseYear && (isNaN(yearNum!) || yearNum! < 1800 || yearNum! > 2100)) {
      setError('Introduce un año de lanzamiento válido.');
      return;
    }

    setError(null);
    onSubmit({
      title: cleanTitle,
      subtitle: subtitle.trim() || undefined,
      releaseYear: yearNum,
      coverUrl: coverUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-title">Título *</Label>
        <Input
          id="item-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="p. ej. The Legend of Zelda: Ocarina of Time"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-subtitle">Subtítulo / Autor / Estudio</Label>
        <Input
          id="item-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="p. ej. Nintendo EAD"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-year">Año de lanzamiento</Label>
        <Input
          id="item-year"
          type="number"
          min={1800}
          max={2100}
          value={releaseYear}
          onChange={(e) => setReleaseYear(e.target.value)}
          placeholder="p. ej. 1998"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-cover">URL de portada (imagen)</Label>
        <Input
          id="item-cover"
          type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://ejemplo.com/caratula.jpg"
        />
        <span className="text-[11px] text-muted-foreground">
          Si no tienes imagen, se mostrará un elegante placeholder automático.
        </span>
      </div>

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
