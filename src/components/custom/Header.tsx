import { useState } from 'react';
import { Link } from 'react-router';
import { Layers, LogIn, Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { GamificationHeaderBar } from '@/features/gamification/components/GamificationHeaderBar';
import { useAuth } from '@/features/sync/hooks/useAuth';
import { AccountMenu } from '@/features/sync/components/AccountMenu';
import { AuthDialog } from '@/features/sync/components/AuthDialog';
import { WrappedDialog } from '@/features/gamification/components/WrappedDialog';

export interface Props {
  className?: string;
}

export function Header({ className }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { user, isSupabaseConfigured } = useAuth();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 ${
        className ?? ''
      }`}
    >
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            Hoardex
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <GamificationHeaderBar />

          {/* Botón destacado Hoardex Wrapped */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWrappedOpen(true)}
            className="gap-1.5 text-xs sm:text-sm font-semibold rounded-full px-2.5 sm:px-3 h-8 border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300"
            aria-label="Ver Hoardex Wrapped"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Wrapped</span>
          </Button>

          {/* Si el usuario está autenticado, muestra su menú de cuenta */}
          {user ? (
            <AccountMenu />
          ) : (
            isSupabaseConfigured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuthOpen(true)}
                className="gap-1.5 text-xs sm:text-sm font-medium rounded-full px-3 h-8 border-border/80"
              >
                <LogIn className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Button>
            )
          )}

          {/* Selector de tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
            className="rounded-full text-foreground/80 hover:text-foreground h-8 w-8"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Diálogos modales */}
      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <WrappedDialog open={isWrappedOpen} onOpenChange={setIsWrappedOpen} />
    </header>
  );
}
