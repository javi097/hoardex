import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim().length > 0;

/**
 * Indica si las variables de entorno de Supabase están configuradas y son válidas.
 */
export const isSupabaseConfigured: boolean =
  isValidString(rawUrl) && isValidString(rawKey);

/**
 * Cliente tipado de Supabase. Es null cuando la aplicación se ejecuta en modo
 * local-first sin credenciales de backend en .env.local.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl as string, rawKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
