import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePublicProfile } from './usePublicProfile';
import type { User } from '@supabase/supabase-js';

let mockUser: User | null = null;
let mockIsConfigured = true;

vi.mock('@/features/sync/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isSupabaseConfigured: mockIsConfigured,
  }),
}));

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsConfigured;
  },
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('usePublicProfile hook', () => {
  const sampleProfileRow = {
    id: 'user-pub-1',
    username: 'alex',
    display_name: 'Alex Gamer',
    avatar_url: 'https://example.com/alex.jpg',
    bio: 'Jugador empedernido',
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleCollectionRow = {
    id: 'col-pub-1',
    user_id: 'user-pub-1',
    name: 'Juegos Switch',
    description: 'Mis favoritos',
    icon: 'Gamepad2',
    accent_color: '#ef4444',
    provider: 'rawg',
    statuses: [{ id: 's1', label: 'Terminado', isCompleted: true, order: 0 }],
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleItemRow = {
    id: 'item-pub-1',
    user_id: 'user-pub-1',
    collection_id: 'col-pub-1',
    title: 'Super Mario Odyssey',
    subtitle: null,
    release_year: 2017,
    cover_url: null,
    status_id: 's1',
    rating: 5,
    notes: 'Increíble',
    meta: {},
    xp_awarded: true,
    review_xp_awarded: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleGamificationRow = {
    total_xp: 350,
    streak: { currentStreak: 3, longestStreak: 10 },
    unlocked_achievements: [{ achievementId: 'first_item', unlockedAt: '2026-01-01' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockIsConfigured = true;
  });

  it('sets notFound to true immediately when username is empty or undefined', async () => {
    const { result } = renderHook(() => usePublicProfile(''));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notFound).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('sets notFound to true when profile row does not exist in Supabase', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }
      return {};
    });

    const { result } = renderHook(() => usePublicProfile('nonexistent_user'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notFound).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('sets isPrivate to true when profile is_public = false and visitor is not the owner', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...sampleProfileRow, is_public: false },
                error: null,
              }),
            })),
          })),
        };
      }
      return {};
    });

    const { result } = renderHook(() => usePublicProfile('alex'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPrivate).toBe(true);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('allows reading private profile if visitor is the owner (CL-03)', async () => {
    mockUser = { id: 'user-pub-1' } as User;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...sampleProfileRow, is_public: false },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'collections') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [sampleCollectionRow], error: null }),
            })),
          })),
        };
      }
      if (table === 'items') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [sampleItemRow], error: null }),
          })),
        };
      }
      if (table === 'gamification_state') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: sampleGamificationRow, error: null }),
            })),
          })),
        };
      }
      return {};
    });

    const { result } = renderHook(() => usePublicProfile('alex'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPrivate).toBe(false);
    expect(result.current.isOwner).toBe(true);
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.profile.username).toBe('alex');
  });

  it('successfully fetches and aggregates public profile data', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: sampleProfileRow,
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'collections') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [sampleCollectionRow], error: null }),
            })),
          })),
        };
      }
      if (table === 'items') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [sampleItemRow], error: null }),
          })),
        };
      }
      if (table === 'gamification_state') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: sampleGamificationRow, error: null }),
            })),
          })),
        };
      }
      return {};
    });

    const { result } = renderHook(() => usePublicProfile('alex'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notFound).toBe(false);
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.profile.username).toBe('alex');
    expect(result.current.data?.collections).toHaveLength(1);
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.gamification.totalXp).toBe(350);
    expect(result.current.data?.gamification.longestStreak).toBe(10);
    expect(result.current.data?.gamification.level).toBe(3);

    // Test refetch
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data?.profile.username).toBe('alex');
  });
});
