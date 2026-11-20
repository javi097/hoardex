import { Link } from 'react-router';
import { Moon, Sun, Layers } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { GamificationHeaderBar } from '@/features/gamification/components/GamificationHeaderBar';

export interface Props {
  className?: string;
}

export function Header({ className }: Props) {
  const { theme, toggleTheme } = useTheme();

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

        <div className="flex items-center gap-2 sm:gap-3">
          <GamificationHeaderBar />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
            className="rounded-full text-foreground/80 hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

