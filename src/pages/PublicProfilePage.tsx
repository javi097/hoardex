import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  EyeOff,
  Flame,
  Lock,
  Share2,
  Sparkles,
  Trophy,
  UserCog,
  UserX,
} from 'lucide-react';
import { Header } from '@/components/custom/Header';
import { EmptyState } from '@/components/custom/EmptyState';
import { CoverImage } from '@/components/custom/CoverImage';
import { StarRating } from '@/components/custom/StarRating';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/features/users/components/UserAvatar';
import { ProfileSettingsDialog } from '@/features/users/components/ProfileSettingsDialog';
import { AchievementCard } from '@/features/gamification/components/AchievementCard';
import { CollectionIcon } from '@/lib/icons';
import { usePublicProfile } from '@/features/users/hooks/usePublicProfile';
import { ACHIEVEMENTS } from '@/features/gamification/core/achievements';
import { cn } from '@/lib/utils';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { isLoading, notFound, isPrivate, isOwner, data } = usePublicProfile(username);

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Colecciones públicas (garantiza que ninguna colección con isPublic === false sea expuesta)
  const publicCollections = (data?.collections ?? []).filter(
    (c) => c.isPublic !== false
  );

  // Colección activa seleccionada (por defecto la primera si no hay selección manual)
  const activeCollection =
    publicCollections.find((c) => c.id === selectedCollectionId) ??
    (publicCollections.length > 0 ? publicCollections[0] : null);

  // Ítems de la colección activa
  const activeItems =
    activeCollection && data?.items
      ? data.items.filter((item) => item.collectionId === activeCollection.id)
      : [];

  // Logros públicos desbloqueados
  const unlockedAchievementsList = (
    data?.gamification?.unlockedAchievements ?? []
  ).map((unlocked) => {
    const ach = ACHIEVEMENTS.find((a) => a.id === unlocked.achievementId) ?? {
      id: unlocked.achievementId,
      title: unlocked.achievementId,
      description: 'Logro desbloqueado',
      icon: 'Trophy',
      category: 'catalog' as const,
      tier: 'bronze' as const,
      xpReward: 0,
      condition: () => false,
    };
    return { ach, unlocked };
  });

  const handleShareProfile = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Enlace al perfil copiado');
      }
    } catch (err: unknown) {
      console.error('Error al copiar enlace:', err);
      toast.error('No se pudo copiar el enlace al portapapeles');
    }
  };

  const joinedYear = data?.profile?.createdAt
    ? new Date(data.profile.createdAt).getFullYear()
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="container mx-auto max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* Navegación hacia inicio */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md py-1 px-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Volver a colecciones</span>
          </Link>
        </div>

        {/* 1. Estado de Carga (Skeleton accesible) */}
        {isLoading && (
          <div
            role="status"
            aria-busy="true"
            aria-label="Cargando perfil público"
            className="space-y-6 animate-pulse"
          >
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="h-24 w-24 rounded-full bg-muted shrink-0" />
                <div className="space-y-2.5 flex-1 text-center sm:text-left w-full">
                  <div className="h-7 w-48 bg-muted rounded-md mx-auto sm:mx-0" />
                  <div className="h-4 w-32 bg-muted rounded-md mx-auto sm:mx-0" />
                  <div className="h-12 w-full max-w-md bg-muted rounded-md mt-3" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-border/60 bg-card p-4" />
              ))}
            </div>

            <div className="h-64 rounded-2xl border border-border/60 bg-card p-6" />
          </div>
        )}

        {/* 2. Estado No Encontrado (404) */}
        {!isLoading && notFound && (
          <EmptyState
            icon={<UserX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
            title="Coleccionista no encontrado"
            description={`No hemos podido encontrar ningún perfil registrado con el identificador @${
              username || ''
            }.`}
            action={
              <Link to="/">
                <Button variant="outline">Volver al inicio</Button>
              </Link>
            }
          />
        )}

        {/* 3. Estado Perfil Privado */}
        {!isLoading && !notFound && isPrivate && (
          <EmptyState
            icon={<Lock className="h-6 w-6 text-amber-500" aria-hidden="true" />}
            title="Perfil privado"
            description="Este perfil es privado. El coleccionista ha decidido mantener su biblioteca oculta para visitantes externos."
            action={
              <Link to="/">
                <Button variant="outline">Volver al inicio</Button>
              </Link>
            }
          />
        )}

        {/* 4. Perfil Visible */}
        {!isLoading && !notFound && !isPrivate && data && (
          <div className="space-y-8 animate-in fade-in-50 duration-200">
            {/* Banner de previsualización para el propietario si su perfil es privado (CL-03) */}
            {isOwner && !data.profile.isPublic && (
              <div
                role="status"
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100"
              >
                <div className="flex items-center gap-2.5">
                  <EyeOff className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">
                      Vista previa de tu perfil (Privado para el resto del público)
                    </p>
                    <p className="text-xs opacity-90">
                      Tu biblioteca está oculta para visitantes externos. Solo tú puedes ver esta página.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="gap-2 shrink-0 border-amber-500/40 bg-background/80 hover:bg-background text-foreground"
                >
                  <UserCog className="h-4 w-4" />
                  <span>Editar perfil</span>
                </Button>
              </div>
            )}

            {/* Cabecera de Identidad */}
            <section
              aria-label="Información del perfil"
              className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card to-card/60 p-6 sm:p-8 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <UserAvatar
                  avatarUrl={data.profile.avatarUrl}
                  displayName={data.profile.displayName}
                  username={data.profile.username}
                  size="xl"
                  className="h-24 w-24 sm:h-28 sm:w-28 text-3xl sm:text-4xl shadow-md ring-4 ring-background"
                />

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                        {data.profile.displayName}
                      </h1>
                      <p className="text-sm font-medium text-muted-foreground font-mono">
                        @{data.profile.username}
                      </p>
                    </div>

                    <div className="flex items-center justify-center sm:justify-end gap-2 pt-1 sm:pt-0">
                      {isOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditProfileOpen(true)}
                          className="gap-1.5 font-medium"
                        >
                          <UserCog className="h-4 w-4" />
                          <span>Editar perfil</span>
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleShareProfile}
                        className="gap-1.5 font-medium"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Compartir perfil</span>
                      </Button>
                    </div>
                  </div>

                  {data.profile.bio && (
                    <p className="mt-3 text-sm text-foreground/90 max-w-2xl whitespace-pre-line leading-relaxed">
                      {data.profile.bio}
                    </p>
                  )}

                  {joinedYear && (
                    <div className="mt-4 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Coleccionista desde {joinedYear}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Resumen de Gamificación Pública */}
            <section
              aria-label="Métricas públicas de coleccionista"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
            >
              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>Nivel</span>
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-extrabold text-foreground">
                    Nivel {data.gamification.level}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={data.gamification.levelTitle}>
                    {data.gamification.levelTitle}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Trophy className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                  <span>Experiencia</span>
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-extrabold text-foreground">
                    {data.gamification.totalXp.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">XP acumulada</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  <span>Racha récord</span>
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-extrabold text-foreground">
                    {data.gamification.longestStreak}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.gamification.longestStreak === 1 ? 'Día consecutivo' : 'Días consecutivos'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Trophy className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  <span>Logros</span>
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-extrabold text-foreground">
                    {data.gamification.unlockedAchievements.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Desbloqueados</p>
                </div>
              </div>
            </section>

            {/* Estantería de Colecciones Públicas */}
            <section aria-labelledby="public-collections-title" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2
                    id="public-collections-title"
                    className="font-heading text-xl font-bold tracking-tight text-foreground"
                  >
                    Colecciones públicas
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {publicCollections.length}
                  </Badge>
                </div>
              </div>

              {publicCollections.length === 0 ? (
                <EmptyState
                  title="Sin colecciones públicas"
                  description="Este coleccionista no tiene colecciones públicas visibles en su perfil."
                />
              ) : (
                <div className="space-y-6">
                  {/* Selector / Pestañas de colecciones */}
                  <div
                    role="tablist"
                    aria-label="Colecciones públicas del usuario"
                    className="flex flex-wrap gap-2 border-b border-border/60 pb-3"
                  >
                    {publicCollections.map((col) => {
                      const isSelected = activeCollection?.id === col.id;
                      const itemCount = data.items.filter((it) => it.collectionId === col.id).length;

                      return (
                        <button
                          key={col.id}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setSelectedCollectionId(col.id)}
                          style={
                            isSelected
                              ? ({
                                  '--col-accent': col.accentColor,
                                } as React.CSSProperties)
                              : undefined
                          }
                          className={cn(
                            'group flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer',
                            isSelected
                              ? 'border-[var(--col-accent)] bg-card shadow-xs text-foreground font-semibold'
                              : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <div
                            className="flex h-5 w-5 items-center justify-center rounded-md text-white text-xs shrink-0"
                            style={{ backgroundColor: col.accentColor }}
                          >
                            <CollectionIcon name={col.icon} className="h-3 w-3" />
                          </div>
                          <span>{col.name}</span>
                          <span className="rounded-full bg-muted px-1.5 py-0.2 text-2xs text-muted-foreground font-semibold">
                            {itemCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Cuadrícula de ítems de la colección activa */}
                  {activeCollection && (
                    <div className="space-y-4">
                      {activeCollection.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {activeCollection.description}
                        </p>
                      )}

                      {activeItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                          Aún no hay ítems en esta colección.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {activeItems.map((item) => {
                            const status = activeCollection.statuses.find(
                              (s) => s.id === item.statusId
                            );

                            return (
                              <article
                                key={item.id}
                                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card p-2.5 shadow-xs transition-all hover:border-border hover:shadow-md"
                              >
                                <div>
                                  {/* Portada */}
                                  <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-muted shadow-2xs">
                                    <CoverImage
                                      src={item.coverUrl}
                                      alt={item.title}
                                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    {status && (
                                      <div className="absolute top-1.5 left-1.5">
                                        <Badge
                                          variant="secondary"
                                          className="text-3xs py-0 px-1.5 backdrop-blur-md bg-background/85 font-medium shadow-2xs"
                                        >
                                          {status.label}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>

                                  {/* Título */}
                                  <h3 className="mt-2 font-heading text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                                    {item.title}
                                  </h3>
                                </div>

                                <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                  {typeof item.rating === 'number' && item.rating > 0 && (
                                    <div className="flex items-center">
                                      <StarRating
                                        value={item.rating}
                                        readonly
                                        size="sm"
                                      />
                                    </div>
                                  )}

                                  {item.notes && (
                                    <p
                                      className="text-2xs text-muted-foreground line-clamp-2 italic"
                                      title={item.notes}
                                    >
                                      &ldquo;{item.notes}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Vitrina de Logros Públicos */}
            <section aria-labelledby="public-achievements-title" className="space-y-4">
              <div className="flex items-center gap-2">
                <h2
                  id="public-achievements-title"
                  className="font-heading text-xl font-bold tracking-tight text-foreground"
                >
                  Vitrina de logros
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {unlockedAchievementsList.length}
                </Badge>
              </div>

              {unlockedAchievementsList.length === 0 ? (
                <EmptyState
                  title="Sin logros desbloqueados"
                  description="Este coleccionista aún no ha desbloqueado logros públicos."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {unlockedAchievementsList.map(({ ach, unlocked }) => (
                    <AchievementCard
                      key={ach.id}
                      achievement={ach}
                      unlockedInfo={unlocked}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Modal de edición de perfil si el usuario es dueño */}
            {isOwner && (
              <ProfileSettingsDialog
                open={isEditProfileOpen}
                onOpenChange={setIsEditProfileOpen}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
