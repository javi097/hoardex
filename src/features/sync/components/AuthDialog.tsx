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

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = 'signIn',
}: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setIsLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-full max-w-md p-6 sm:rounded-2xl"
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
              disabled={isLoading}
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
              disabled={isLoading}
              minLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2 font-medium"
            disabled={isLoading}
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

        <div className="text-center text-xs text-muted-foreground">
          {mode === 'signIn' ? (
            <p>
              ¿No tienes una cuenta aún?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signUp')}
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
