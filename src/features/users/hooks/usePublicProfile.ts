import { useEffect, useState, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/features/sync/hooks/useAuth';
import {
  mapCollectionRowToCollection,
  mapItemRowToItem,
} from '@/features/sync/core/mappers';
import { calculateLevelProgress } from '@/features/gamification/core/levels';
import { mapProfileRowToProfile } from '../core/profiles';
import type {
  PublicProfileData,
  PublicGamificationSummary,
  ProfileRow,
} from '@/interfaces/user.interface';
import type {
  CollectionRow,
  GamificationStateRow,
  ItemRow,
} from '@/interfaces/sync.interface';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import type { StreakInfo, UnlockedAchievement } from '@/interfaces/gamification.interface';

export interface UsePublicProfileReturn {
  isLoading: boolean;
  notFound: boolean;
  isPrivate: boolean;
  isOwner: boolean;
  error: string | null;
  data: PublicProfileData | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para consultar de forma pública el perfil, colecciones, ítems y gamificación de un usuario por su @username.
 */
export function usePublicProfile(username: string | undefined): UsePublicProfileReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicProfileData | null>(null);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!username || username.trim() === '') {
        await Promise.resolve();
        if (!ignore) {
          setIsLoading(false);
          setNotFound(true);
          setIsPrivate(false);
          setIsOwner(false);
          setData(null);
        }
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        await Promise.resolve();
        if (!ignore) {
          setIsLoading(false);
          setError('No se puede consultar el perfil público sin conexión a Supabase.');
          setData(null);
        }
        return;
      }

      const cleanUsername = username.trim().toLowerCase();

      try {
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (ignore) return;

        if (profileErr || !profileRow) {
          setIsLoading(false);
          setNotFound(true);
          setData(null);
          return;
        }

        const typedProfileRow = profileRow as ProfileRow;
        const owner = Boolean(userRef.current && userRef.current.id === typedProfileRow.id);
        setIsOwner(owner);

        if (!typedProfileRow.is_public && !owner) {
          setIsLoading(false);
          setIsPrivate(true);
          setData(null);
          return;
        }

        const { data: colRows, error: colErr } = await supabase
          .from('collections')
          .select('*')
          .eq('user_id', typedProfileRow.id)
          .eq('is_public', true);

        if (colErr) {
          console.error('Error al consultar colecciones públicas:', colErr);
        }

        const publicCols: Collection[] = ((colRows as CollectionRow[] | null) ?? []).map(
          mapCollectionRowToCollection
        );

        let publicItems: Item[] = [];
        const colIds = publicCols.map((c) => c.id);

        if (colIds.length > 0) {
          const { data: itemRows, error: itemErr } = await supabase
            .from('items')
            .select('*')
            .in('collection_id', colIds);

          if (itemErr) {
            console.error('Error al consultar ítems públicos:', itemErr);
          }

          publicItems = ((itemRows as ItemRow[] | null) ?? []).map(mapItemRowToItem);
        }

        const { data: gamRow, error: gamErr } = await supabase
          .from('gamification_state')
          .select('total_xp, streak, unlocked_achievements')
          .eq('user_id', typedProfileRow.id)
          .maybeSingle();

        if (gamErr) {
          console.error('Error al consultar gamificación pública:', gamErr);
        }

        const typedGamRow = gamRow as Partial<GamificationStateRow> | null;
        const totalXp = typedGamRow?.total_xp ?? 0;
        const levelProgress = calculateLevelProgress(totalXp);
        const streakObj = typedGamRow?.streak as StreakInfo | undefined;
        const achievements = (typedGamRow?.unlocked_achievements as UnlockedAchievement[] | undefined) ?? [];

        const gamification: PublicGamificationSummary = {
          level: levelProgress.level,
          levelTitle: levelProgress.title,
          totalXp,
          longestStreak: streakObj?.longestStreak ?? 0,
          unlockedAchievements: Array.isArray(achievements) ? achievements : [],
        };

        const domainProfile = mapProfileRowToProfile(typedProfileRow);

        if (!ignore) {
          setData({
            profile: domainProfile,
            collections: publicCols,
            items: publicItems,
            gamification,
          });
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Error al cargar perfil público:', err);
          setIsLoading(false);
          setError(
            err instanceof Error ? err.message : 'Error inesperado al cargar el perfil público.'
          );
          setData(null);
        }
      }
    }

    loadRef.current = load;
    void load();

    return () => {
      ignore = true;
    };
  }, [username]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await loadRef.current();
  }, []);

  return {
    isLoading,
    notFound,
    isPrivate,
    isOwner,
    error,
    data,
    refetch,
  };
}
