import { useState, type FormEvent } from 'react';
import { Loader2, UserCog } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '../hooks/useProfile';
import { validateUsername } from '../core/profiles';
import { UserAvatar } from './UserAvatar';
import { cn } from '@/lib/utils';
import type { Profile, UpdateProfileParams } from '@/interfaces/user.interface';

export interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormProps {
  profile: Profile | null;
  onSave: (params: UpdateProfileParams) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

function ProfileSettingsForm({ profile, onSave, onClose }: FormProps) {
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validación reactiva de username
  const usernameValidation = validateUsername(username);

  // Validación de URL de avatar si no está vacía
  const isAvatarUrlValid =
    !avatarUrl.trim() || /^https?:\/\/.+/i.test(avatarUrl.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!usernameValidation.isValid) {
      setFormError(usernameValidation.error ?? 'Nombre de usuario inválido.');
      return;
    }

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName || trimmedDisplayName.length > 50) {
      setFormError('El nombre para mostrar debe tener entre 1 y 50 caracteres.');
      return;
    }

    if (!isAvatarUrlValid) {
      setFormError('La URL del avatar debe comenzar con http:// o https://.');
      return;
    }

    if (bio.length > 280) {
      setFormError('La biografía no puede superar los 280 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await onSave({
        username: username.trim().toLowerCase(),
        displayName: trimmedDisplayName,
        avatarUrl: avatarUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        isPublic,
      });

      if (result.success) {
        onClose();
      } else {
        setFormError(result.error ?? 'No se pudo guardar el perfil.');
      }
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Error inesperado al guardar el perfil.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Previsualización en vivo */}
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-3.5">
        <UserAvatar
          avatarUrl={avatarUrl}
          displayName={displayName || 'Usuario'}
          username={username}
          size="lg"
        />
        <div className="space-y-1 min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-bold text-foreground">
            {displayName || 'Tu nombre'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{username || 'usuario'}
          </p>
          <p className="text-2xs font-medium text-primary">Previsualización en vivo</p>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs sm:text-sm text-destructive"
        >
          {formError}
        </div>
      )}

      {/* Nombre para mostrar */}
      <div className="space-y-1.5">
        <Label htmlFor="profile-display-name">Nombre para mostrar *</Label>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Tu nombre o alias"
          maxLength={50}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Identificador @username */}
      <div className="space-y-1.5">
        <Label htmlFor="profile-username">Identificador único (@username) *</Label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-sm font-semibold text-muted-foreground select-none">
            @
          </span>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().trim());
              if (formError) setFormError(null);
            }}
            placeholder="tu_usuario"
            className="pl-8"
            maxLength={20}
            required
            disabled={isSubmitting}
            aria-describedby="username-hint username-error"
          />
        </div>
        {!usernameValidation.isValid && username.length > 0 && (
          <p id="username-error" role="alert" className="text-xs text-destructive">
            {usernameValidation.error}
          </p>
        )}
        <p id="username-hint" className="text-2xs text-muted-foreground">
          Nota: Si cambias tu nombre de usuario, los enlaces anteriores a tu perfil
          dejarán de funcionar.
        </p>
      </div>

      {/* Foto de perfil (URL) */}
      <div className="space-y-1.5">
        <Label htmlFor="profile-avatar-url">URL de foto de perfil (opcional)</Label>
        <Input
          id="profile-avatar-url"
          type="url"
          value={avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="https://ejemplo.com/tu-foto.jpg"
          disabled={isSubmitting}
        />
        {!isAvatarUrlValid && (
          <p role="alert" className="text-xs text-destructive">
            La URL del avatar debe comenzar con http:// o https://.
          </p>
        )}
      </div>

      {/* Biografía */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-bio">Biografía (opcional)</Label>
          <span
            className={cn(
              'text-2xs',
              bio.length > 260 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'
            )}
          >
            {bio.length}/280
          </span>
        </div>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Cuéntanos qué coleccionas..."
          maxLength={280}
          rows={3}
          disabled={isSubmitting}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Interruptor de Visibilidad */}
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="space-y-0.5 pr-2">
          <Label
            htmlFor="profile-public-switch"
            className="text-sm font-semibold cursor-pointer"
          >
            {isPublic ? 'Perfil público' : 'Perfil privado'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? `Cualquier visitante podrá ver tus colecciones públicas y logros en /u/${
                  username || '...'
                }`
              : 'Tu perfil y biblioteca no serán visibles para visitantes externos.'}
          </p>
        </div>
        <button
          type="button"
          id="profile-public-switch"
          role="switch"
          aria-checked={isPublic}
          aria-label={isPublic ? 'Cambiar a perfil privado' : 'Cambiar a perfil público'}
          onClick={() => setIsPublic(!isPublic)}
          disabled={isSubmitting}
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

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !usernameValidation.isValid || !isAvatarUrlValid}
          className="gap-2 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>Guardar cambios</span>
          )}
        </Button>
      </div>
    </form>
  );
}

/**
 * Diálogo modal accesible para editar datos de perfil y privacidad.
 */
export function ProfileSettingsDialog({ open, onOpenChange }: Props) {
  const { profile, saveProfile } = useProfile();

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-lg p-6 sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCog className="h-4 w-4" />
            </div>
            <DialogTitle className="font-heading text-xl font-bold tracking-tight">
              Editar perfil
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Personaliza tu identidad de coleccionista y la visibilidad de tu biblioteca.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ProfileSettingsForm
            key={profile?.id ?? 'profile-form'}
            profile={profile}
            onSave={saveProfile}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
