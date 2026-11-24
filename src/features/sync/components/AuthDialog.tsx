import { useState, type FormEvent } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
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
import { useAuth } from '@/features/sync/hooks/useAuth';

export interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'signIn' | 'signUp';
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.36 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.27 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.93.04-2.02.63-2.67 1.38-.56.65-.99 1.72-.88 2.76 1.02.08 2.05-.53 2.63-1.27z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = 'signIn',
}: Props) {
  const { signIn, signUp, signInWithOAuth, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | 'github' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAnyLoading = isLoading || oauthLoading !== null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setIsLoading(false);
    setOauthLoading(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSwitchMode = (nextMode: 'signIn' | 'signUp') => {
    setMode(nextMode);
    setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Por favor, introduce tu correo electrónico.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('El formato de correo electrónico no es válido.');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mode === 'signIn') {
        const result = await signIn(email.trim(), password);
        if (result.success) {
          toast.success('¡Bienvenido de nuevo a Hoardex!');
          handleOpenChange(false);
        } else {
          setErrorMessage(
            result.error ?? 'Credenciales incorrectas o error al iniciar sesión.'
          );
        }
      } else {
        const result = await signUp(email.trim(), password);
        if (result.success) {
          toast.success('Cuenta creada con éxito. ¡Sesión iniciada!');
          handleOpenChange(false);
        } else {
          setErrorMessage(
            result.error ?? 'No se pudo crear la cuenta. Inténtalo de nuevo.'
          );
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error de comunicación inesperado.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'github') => {
    setOauthLoading(provider);
    setErrorMessage(null);

    try {
      const result = await signInWithOAuth(provider);
      if (!result.success) {
        const msg = result.error ?? `Error al conectar con ${provider}.`;
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : `Error inesperado al conectar con ${provider}.`;
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-full max-w-md p-6 sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold tracking-tight">
            {mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === 'signIn'
              ? 'Accede con tu cuenta para sincronizar tus colecciones en la nube.'
              : 'Regístrate para guardar y sincronizar tu catálogo en todos tus dispositivos.'}
          </DialogDescription>
        </DialogHeader>

        {/* Selector de modo */}
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signIn'}
            onClick={() => handleSwitchMode('signIn')}
            disabled={isAnyLoading}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs sm:text-sm font-medium transition-all ${
              mode === 'signIn'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Iniciar sesión</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signUp'}
            onClick={() => handleSwitchMode('signUp')}
            disabled={isAnyLoading}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs sm:text-sm font-medium transition-all ${
              mode === 'signUp'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Crear cuenta</span>
          </button>
        </div>

        {/* Mensaje de error accesible */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs sm:text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Correo electrónico</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAnyLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Contraseña</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={
                mode === 'signIn' ? 'current-password' : 'new-password'
              }
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAnyLoading}
              minLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2 font-medium"
            disabled={isAnyLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {mode === 'signIn'
                    ? 'Iniciando sesión...'
                    : 'Creando cuenta...'}
                </span>
              </>
            ) : mode === 'signIn' ? (
              <>
                <LogIn className="h-4 w-4" />
                <span>Entrar</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Registrarme</span>
              </>
            )}
          </Button>
        </form>

        {/* Proveedores OAuth */}
        {isSupabaseConfigured && (
          <div className="space-y-3 pt-1">
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground text-2xs font-medium">
                  o continuar con
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth('google')}
                disabled={isAnyLoading}
                className="w-full justify-center gap-2.5 font-medium"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="h-4 w-4 shrink-0" />
                )}
                <span>Continuar con Google</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth('apple')}
                disabled={isAnyLoading}
                className="w-full justify-center gap-2.5 font-medium"
              >
                {oauthLoading === 'apple' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AppleIcon className="h-4 w-4 shrink-0" />
                )}
                <span>Continuar con Apple</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth('github')}
                disabled={isAnyLoading}
                className="w-full justify-center gap-2.5 font-medium"
              >
                {oauthLoading === 'github' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitHubIcon className="h-4 w-4 shrink-0" />
                )}
                <span>Continuar con GitHub</span>
              </Button>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-1">
          {mode === 'signIn' ? (
            <p>
              ¿No tienes una cuenta aún?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signUp')}
                disabled={isAnyLoading}
                className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
              >
                Crear cuenta
              </button>
            </p>
          ) : (
            <p>
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signIn')}
                disabled={isAnyLoading}
                className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
