import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/features/sync/hooks/useAuth';
import { useProfileStore } from '../store/profile.store';
import {
  mapProfileRowToProfile,
  mapProfileToRow,
  validateUsername,
} from '../core/profiles';
import type { Profile, UpdateProfileParams } from '@/interfaces/user.interface';

export interface UseProfileReturn {
  profile: Profile | null;
  isLoading: boolean;
  saveProfile: (params: UpdateProfileParams) => Promise<{
    success: boolean;
    error?: string;
  }>;
  refreshProfile: () => Promise<void>;
}

/**
 * Hook para gestionar la carga, sincronización y mutación del perfil del usuario autenticado.
 */
export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const setProfile = useProfileStore((state) => state.setProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const setIsLoading = useProfileStore((state) => state.setIsLoading);
  const clearProfile = useProfileStore((state) => state.clearProfile);

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!isSupabaseConfigured || !supabase) {
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error al consultar perfil en Supabase:', error);
          setIsLoading(false);
          return;
        }

        if (data) {
          setProfile(mapProfileRowToProfile(data));
        } else {
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error('Error inesperado al cargar perfil:', err);
        setIsLoading(false);
      }
    },
    [setProfile, setIsLoading]
  );

  useEffect(() => {
    if (!user) {
      clearProfile();
    } else if (isSupabaseConfigured) {
      void fetchProfile(user.id);
    }
  }, [user, fetchProfile, clearProfile]);

  const saveProfile = useCallback(
    async (
      params: UpdateProfileParams
    ): Promise<{ success: boolean; error?: string }> => {
      if (params.username !== undefined) {
        const validation = validateUsername(params.username);
        if (!validation.isValid) {
          return { success: false, error: validation.error };
        }
      }

      if (!user || !isSupabaseConfigured || !supabase) {
        return { success: false, error: 'No hay una sesión activa.' };
      }

      const now = new Date().toISOString();
      const rowUpdates = mapProfileToRow({
        id: user.id,
        ...params,
        updatedAt: now,
      });

      try {
        const { error } = await supabase
          .from('profiles')
          .update(rowUpdates)
          .eq('id', user.id);

        if (error) {
          if (error.code === '23505') {
            return {
              success: false,
              error: 'El nombre de usuario ya está en uso por otra cuenta.',
            };
          }
          return {
            success: false,
            error: error.message || 'Error al actualizar el perfil.',
          };
        }

        updateProfile({ ...params, updatedAt: now });
        toast.success('Perfil actualizado correctamente');
        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error inesperado al guardar el perfil.';
        return { success: false, error: message };
      }
    },
    [user, updateProfile]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    profile,
    isLoading,
    saveProfile,
    refreshProfile,
  };
}
