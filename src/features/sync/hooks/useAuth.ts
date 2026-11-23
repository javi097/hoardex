import { useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useSyncStore } from '@/features/sync/store/sync.store';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export interface UseAuthReturn {
  user: User | null;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
}

/**
 * Hook para gestión de autenticación con Supabase, reactividad de sesión y modo local-first.
 */
export function useAuth(): UseAuthReturn {
  const user = useSyncStore((state) => state.user);
  const setUser = useSyncStore((state) => state.setUser);
  const setSyncStatus = useSyncStore((state) => state.setSyncStatus);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    // Inicializar sesión activa si no se ha hidratado
    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSyncStatus('local');
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSyncStatus]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: 'Supabase no está configurado.' };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          setUser(data.user);
        }

        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al iniciar sesión.';
        return { success: false, error: message };
      }
    },
    [setUser]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: 'Supabase no está configurado.' };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.session?.user) {
          setUser(data.session.user);
        } else if (data.user) {
          setUser(data.user);
        }

        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al registrar usuario.';
        return { success: false, error: message };
      }
    },
    [setUser]
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err: unknown) {
      console.error('Error al cerrar sesión en Supabase:', err);
    } finally {
      setUser(null);
      setSyncStatus('local');
      toast.info('Sesión cerrada. Ahora estás en modo local.');
    }
  }, [setUser, setSyncStatus]);

  return {
    user,
    isSupabaseConfigured,
    signIn,
    signInWithPassword: signIn,
    signUp,
    signOut,
  };
}
