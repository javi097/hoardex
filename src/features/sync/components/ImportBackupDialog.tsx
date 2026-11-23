import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Layers,
  Package,
  Trophy,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { validateBackup } from '@/features/sync/core/backup';
import type { HoardexBackup } from '@/interfaces/sync.interface';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { useSyncStore } from '@/features/sync/store/sync.store';
import { useSyncEngine } from '@/features/sync/hooks/useSyncEngine';

export interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportBackupDialog({ open, onOpenChange }: Props) {
  const { syncNow } = useSyncEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<HoardexBackup | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = () => {
    setFileName(null);
    setParsedBackup(null);
    setValidationError(null);
    setIsDragOver(false);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setFileName(file.name);
      setParsedBackup(null);
      setValidationError('El archivo debe tener extensión .json');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setValidationError(null);

    try {
      const text = await file.text();
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(text);
      } catch {
        setParsedBackup(null);
        setValidationError('El archivo no contiene un JSON válido o está corrupto.');
        setIsProcessing(false);
        return;
      }

      const result = validateBackup(rawJson);
      if (!result.isValid) {
        setParsedBackup(null);
        setValidationError(result.error);
      } else {
        setValidationError(null);
        setParsedBackup(result.backup);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al leer el archivo.';
      setParsedBackup(null);
      setValidationError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleRestore = () => {
    if (!parsedBackup) return;

    // Hidratar stores locales atómicamente
    useCollectionsStore.getState().hydrateCollections(parsedBackup.collections);
    useItemsStore.getState().hydrateItems(parsedBackup.items);
    useGamificationStore
      .getState()
      .hydrateGamification(parsedBackup.gamification);

    // Si el usuario está autenticado, sincronizar inmediatamente con la nube
    const user = useSyncStore.getState().user;
    if (user) {
      void syncNow();
    }

    toast.success(
      `Copia de seguridad restaurada con éxito (${parsedBackup.collections.length} colecciones, ${parsedBackup.items.length} ítems)`
    );

    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-full max-w-lg p-6 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
            <FileJson className="h-5 w-5 text-primary" />
            <span>Restaurar copia de seguridad</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Selecciona un archivo JSON de respaldo exportado previamente desde Hoardex.
          </DialogDescription>
        </DialogHeader>

        {/* Zona drag and drop e input oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="backup-file-input"
          data-testid="backup-file-input"
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/80 hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {fileName ? fileName : 'Arrastra tu archivo aquí o haz clic para examinar'}
            </p>
            <p className="text-xs text-muted-foreground">
              Formato admitido: JSON versión 1 (*.json)
            </p>
          </div>
        </div>

        {/* Alerta de error de validación */}
        {validationError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Archivo no válido</p>
              <p className="opacity-90">{validationError}</p>
            </div>
          </div>
        )}

        {/* Resumen del archivo validado */}
        {parsedBackup && !validationError && (
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Copia de seguridad válida</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-background p-2.5 shadow-2xs border border-border/50">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Colecciones</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {parsedBackup.collections.length}
                </p>
              </div>

              <div className="rounded-lg bg-background p-2.5 shadow-2xs border border-border/50">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>Ítems</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {parsedBackup.items.length}
                </p>
              </div>

              <div className="rounded-lg bg-background p-2.5 shadow-2xs border border-border/50">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span>XP</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {parsedBackup.gamification.totalXp}
                </p>
              </div>
            </div>

            <p className="text-2xs text-muted-foreground text-center">
              Exportado el: {new Date(parsedBackup.exportedAt).toLocaleString('es-ES')}
            </p>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleRestore}
            disabled={!parsedBackup || Boolean(validationError) || isProcessing}
            className="gap-2 font-medium"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Restaurar datos</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
