import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useProfile } from './useProfile';
import { useProfileStore } from '../store/profile.store';
import type { User } from '@supabase/supabase-js';

let mockUser: User | null = null;
let mockIsConfigured = true;

vi.mock('@/features/sync/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isSupabaseConfigured: mockIsConfigured,
  }),
}));

const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsConfigured;
  },
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockSingle,
            })),
          })),
          update: mockUpdate,
        };
      }
      return {};
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useProfile hook', () => {
  const sampleUser: User = {
    id: 'user-hook-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    email: 'javi@hoardex.app',
    phone: '',
    role: 'authenticated',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleProfileRow = {
    id: 'user-hook-1',
    username: 'javi',
    display_name: 'Javier',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Fan de Nintendo',
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProfileStore.getState().clearProfile();
    mockUser = null;
    mockIsConfigured = true;
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({
      eq: mockEq.mockResolvedValue({ error: null }),
    });
  });

  it('clears profile when user is not authenticated', () => {
    mockUser = null;
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile).toBeNull();
  });

  it('fetches profile and hydrates store when user is authenticated', async () => {
    mockUser = sampleUser;
    mockSingle.mockResolvedValue({ data: sampleProfileRow, error: null });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    expect(result.current.profile?.username).toBe('javi');
    expect(result.current.profile?.displayName).toBe('Javier');
  });

  it('rejects invalid username before making Supabase call in saveProfile', async () => {
    mockUser = sampleUser;
    const { result } = renderHook(() => useProfile());

    let response: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      response = await result.current.saveProfile({ username: 'Invalid Username!' });
    });

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/solo puede contener letras minúsculas/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves profile successfully, updates store, and triggers toast', async () => {
    mockUser = sampleUser;
    useProfileStore.getState().setProfile({
      id: 'user-hook-1',
      username: 'javi',
      displayName: 'Javier',
      avatarUrl: null,
      bio: null,
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useProfile());

    let response: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      response = await result.current.saveProfile({
        displayName: 'Javier Gómez',
        bio: 'Mi nueva bio',
      });
    });

    expect(response.success).toBe(true);
    expect(useProfileStore.getState().profile?.displayName).toBe('Javier Gómez');
    expect(useProfileStore.getState().profile?.bio).toBe('Mi nueva bio');
    expect(toast.success).toHaveBeenCalledWith('Perfil actualizado correctamente');
  });

  it('handles username uniqueness collision (23505) with clear Spanish message', async () => {
    mockUser = sampleUser;
    mockEq.mockResolvedValue({
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    const { result } = renderHook(() => useProfile());

    let response: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      response = await result.current.saveProfile({ username: 'taken_user' });
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('El nombre de usuario ya está en uso por otra cuenta.');
  });
});
