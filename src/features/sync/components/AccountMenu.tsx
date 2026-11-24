import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Sparkles,
  Upload,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/sync/hooks/useAuth';
import { useSyncEngine } from '@/features/sync/hooks/useSyncEngine';
import { useProfileStore } from '@/features/users/store/profile.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { generateBackup } from '@/features/sync/core/backup';
import { downloadCatalogCsv } from '@/features/sync/core/csv';
import type { PersistedGamificationData } from '@/interfaces/sync.interface';
import { ImportBackupDialog } from './ImportBackupDialog';
import { WrappedDialog } from '@/features/gamification/components/WrappedDialog';
import { UserAvatar } from '@/features/users/components/UserAvatar';
import { ProfileSettingsDialog } from '@/features/users/components/ProfileSettingsDialog';

export interface Props {
  className?: string;
}

export function AccountMenu({ className }: Props) {
  const { user, signOut } = useAuth();
  const { syncNow, syncStatus, lastSyncedAt } = useSyncEngine();
  const profile = useProfileStore((state) => state.profile);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const handleExportBackup = () => {
    try {
      const collections = useCollectionsStore.getState().collections;
      const items = useItemsStore.getState().items;
      const gam = useGamificationStore.getState();

      const gamData: PersistedGamificationData = {
        totalXp: gam.totalXp,
        streak: gam.streak,
        unlockedAchievements: gam.unlockedAchievements,
        claimedChallengeIds: gam.claimedChallengeIds,
        rewardedCollectionIds: gam.rewardedCollectionIds,
        xpHistory: gam.xpHistory,
      };

      const now = new Date().toISOString();
      const backup = generateBackup(collections, items, gamData, now);

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const dateStr = now.slice(0, 10);

      const a = document.createElement('a');
      a.href = url;
      a.download = `hoardex-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Copia de seguridad descargada.');
      setIsOpen(false);
    } catch (err: unknown) {
      console.error('Error al exportar copia de seguridad:', err);
      toast.error('No se pudo generar la copia de seguridad.');
    }
  };

  const handleExportCsv = () => {
    setIsOpen(false);
    const collections = useCollectionsStore.getState().collections;
    const items = useItemsStore.getState().items;
    downloadCatalogCsv(collections, items);
  };

  const handleSyncClick = () => {
    void syncNow();
  };

  const handleSignOutClick = async () => {
    setIsOpen(false);
    await signOut();
  };

  // Formato relativo o timestamp amigable
  const formattedSyncTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const displayName = profile?.displayName || user.email || 'Usuario';
  const username = profile?.username;

  return (
    <div ref={menuRef} className={`relative inline-block ${className ?? ''}`}>
      {/* Botón trigger accesible */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Menú de cuenta y sincronización"
        className="relative flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-2 py-1 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative flex items-center justify-center">
          <UserAvatar
            avatarUrl={profile?.avatarUrl}
            displayName={displayName}
            username={username}
            size="sm"
            className="h-6 w-6 text-2xs"
          />

          {/* Indicador de estado de sincronización */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${
              syncStatus === 'synced'
                ? 'bg-emerald-500'
                : syncStatus === 'syncing'
                  ? 'bg-blue-500 animate-pulse'
                  : syncStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-muted-foreground'
            }`}
          />
        </div>

        <span className="hidden sm:inline-block max-w-[120px] truncate text-xs font-medium text-foreground">
          {displayName}
        </span>
      </Button>

      {/* Menú desplegable */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Opciones de cuenta"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border/80 bg-popover/95 p-2 shadow-xl backdrop-blur-md z-50 text-foreground animate-in fade-in-0 zoom-in-95"
        >
          {/* Cabecera con avatar, nombre, username y estado de sincronización */}
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center gap-2.5">
              <UserAvatar
                avatarUrl={profile?.avatarUrl}
                displayName={displayName}
                username={username}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate" title={displayName}>
                  {displayName}
                </p>
                {username ? (
                  <p className="text-xs text-muted-foreground truncate" title={`@${username}`}>
                    @{username}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground truncate" title={user.email}>
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-0.5">
              {syncStatus === 'synced' && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-2xs gap-1 py-0.5"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>
                    Sincronizado {formattedSyncTime ? `a las ${formattedSyncTime}` : ''}
                  </span>
                </Badge>
              )}
              {syncStatus === 'syncing' && (
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-2xs gap-1 py-0.5"
                >
                  <RefreshCw className="h-3 w-3 shrink-0 animate-spin" />
                  <span>Sincronizando...</span>
                </Badge>
              )}
              {syncStatus === 'error' && (
                <Badge
                  variant="outline"
                  className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-2xs gap-1 py-0.5"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>Error de sincronización</span>
                </Badge>
              )}
              {syncStatus === 'local' && (
                <Badge variant="outline" className="text-2xs gap-1 py-0.5">
                  <CloudOff className="h-3 w-3 shrink-0" />
                  <span>Modo local</span>
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-1.5" />

          {/* Opciones de perfil social */}
          <div className="space-y-0.5">
            {username && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/u/${username}`);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary" />
                <span>Ver mi perfil público</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setIsProfileSettingsOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <UserCog className="h-4 w-4 text-primary" />
              <span>Editar perfil</span>
            </button>
          </div>

          <Separator className="my-1.5" />

          {/* Acciones de catálogo y backup */}
          <div className="space-y-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSyncClick}
              disabled={syncStatus === 'syncing'}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 text-primary ${
                  syncStatus === 'syncing' ? 'animate-spin' : ''
                }`}
              />
              <span>Sincronizar ahora</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setIsWrappedOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Hoardex Wrapped</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleExportCsv}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span>Exportar catálogo CSV</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleExportBackup}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>Exportar copia de seguridad</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setIsImportOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Upload className="h-4 w-4 text-primary" />
              <span>Restaurar copia de seguridad</span>
            </button>
          </div>

          <Separator className="my-1.5" />

          {/* Cerrar sesión */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOutClick}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}

      {/* Modal de edición de perfil */}
      <ProfileSettingsDialog
        open={isProfileSettingsOpen}
        onOpenChange={setIsProfileSettingsOpen}
      />

      {/* Modal de importación de backup */}
      <ImportBackupDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />

      {/* Modal de Hoardex Wrapped */}
      <WrappedDialog
        open={isWrappedOpen}
        onOpenChange={setIsWrappedOpen}
      />
    </div>
  );
}
