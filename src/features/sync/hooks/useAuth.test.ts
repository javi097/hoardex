import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useSyncStore } from '@/features/sync/store/sync.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';

const mockGetSession = vi.fn();
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (
        cb: (event: string, session: { user: User } | null) => void
      ) => mockOnAuthStateChange(cb),
      signInWithPassword: (credentials: { email: string; password: string }) =>
        mockSignInWithPassword(credentials),
      signInWithOAuth: (params: { provider: string; options?: { redirectTo?: string } }) =>
        mockSignInWithOAuth(params),
      signUp: (credentials: { email: string; password: string }) =>
        mockSignUp(credentials),
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const sampleUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'collector@hoardex.app',
  phone: '',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncStore.getState().resetSyncState();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    useGamificationStore.getState().resetGamification();

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it('subscribes to onAuthStateChange on mount and cleans up on unmount', () => {
    const { unmount } = renderHook(() => useAuth());

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('updates store when onAuthStateChange fires with a session or SIGNED_OUT', () => {
    let authCallback:
      | ((event: string, session: { user: User } | null) => void)
      | undefined;
    mockOnAuthStateChange.mockImplementation(
      (cb: (event: string, session: { user: User } | null) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    renderHook(() => useAuth());

    expect(authCallback).toBeDefined();

    // Evento login
    act(() => {
      authCallback?.('SIGNED_IN', { user: sampleUser });
    });
    expect(useSyncStore.getState().user).toEqual(sampleUser);

    // Evento logout
    act(() => {
      authCallback?.('SIGNED_OUT', null);
    });
    expect(useSyncStore.getState().user).toBeNull();
    expect(useSyncStore.getState().syncStatus).toBe('local');
  });

  it('handles signIn successfully and updates user', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: sampleUser, session: { user: sampleUser } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.signIn('collector@hoardex.app', 'password123');
    });

    expect(res).toEqual({ success: true });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'collector@hoardex.app',
      password: 'password123',
    });
    expect(useSyncStore.getState().user).toEqual(sampleUser);
  });

  it('handles signIn failure gracefully returning error message', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth());

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.signIn(
        'collector@hoardex.app',
        'wrongpassword'
      );
    });

    expect(res).toEqual({
      success: false,
      error: 'Invalid login credentials',
    });
    expect(useSyncStore.getState().user).toBeNull();
  });

  it('handles signUp successfully and updates user if session present', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: sampleUser, session: { user: sampleUser } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.signUp('new@hoardex.app', 'securepass123');
    });

    expect(res).toEqual({ success: true });
    expect(useSyncStore.getState().user).toEqual(sampleUser);
  });

  it('handles signUp failure gracefully', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const { result } = renderHook(() => useAuth());

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.signUp('existing@hoardex.app', 'securepass123');
    });

    expect(res).toEqual({
      success: false,
      error: 'User already registered',
    });
  });

  it('signOut revokes session, keeps local data, sets syncStatus to local and emits toast', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    useSyncStore.getState().setUser(sampleUser);
    useSyncStore.getState().setSyncStatus('synced');

    // Cargar datos locales preexistentes
    useCollectionsStore.setState({
      collections: [
        {
          id: 'col-1',
          name: 'Colección Local',
          icon: 'Layers',
          accentColor: '#3b82f6',
          provider: 'manual',
          statuses: [],
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(useSyncStore.getState().user).toBeNull();
    expect(useSyncStore.getState().syncStatus).toBe('local');

    // Verifica que los datos locales en collections NO se han borrado
    expect(useCollectionsStore.getState().collections).toHaveLength(1);

    // Verifica toast Sonner
    expect(toast.info).toHaveBeenCalledWith(
      'Sesión cerrada. Ahora estás en modo local.'
    );
  });

  it('handles unconfigured Supabase gracefully without throwing', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase', () => ({
      isSupabaseConfigured: false,
      supabase: null,
    }));

    const { useAuth: useAuthUnconfigured } = await import('./useAuth');
    const { result } = renderHook(() => useAuthUnconfigured());

    expect(result.current.isSupabaseConfigured).toBe(false);

    let signInRes: { success: boolean; error?: string } | undefined;
    let signUpRes: { success: boolean; error?: string } | undefined;

    await act(async () => {
      signInRes = await result.current.signIn('a@b.com', '123456');
      signUpRes = await result.current.signUp('a@b.com', '123456');
      await result.current.signOut();
    });

    expect(signInRes).toEqual({
      success: false,
      error: 'Supabase no está configurado.',
    });
    expect(signUpRes).toEqual({
      success: false,
      error: 'Supabase no está configurado.',
    });
    expect(toast.info).toHaveBeenCalledWith(
      'Sesión cerrada. Ahora estás en modo local.'
    );
  });

  it('calls signInWithOAuth with correct provider and redirect URL', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    let res: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      res = await result.current.signInWithOAuth('google');
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    expect(res.success).toBe(true);
  });

  it('handles signInWithOAuth error from Supabase', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: 'OAuth provider error' },
    });

    const { result } = renderHook(() => useAuth());

    let res: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      res = await result.current.signInWithOAuth('github');
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('OAuth provider error');
  });
});
