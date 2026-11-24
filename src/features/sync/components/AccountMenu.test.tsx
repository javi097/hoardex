import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { AccountMenu } from './AccountMenu';
import { useProfileStore } from '@/features/users/store/profile.store';
import type { User } from '@supabase/supabase-js';

const mockSignOut = vi.fn();
const mockSyncNow = vi.fn();
const mockNavigate = vi.fn();
let mockUser: User | null = null;
let mockSyncStatus = 'synced';

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/sync/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
    signIn: vi.fn(),
    signUp: vi.fn(),
    isSupabaseConfigured: true,
  }),
}));

vi.mock('@/features/sync/hooks/useSyncEngine', () => ({
  useSyncEngine: () => ({
    syncNow: mockSyncNow,
    syncStatus: mockSyncStatus,
    lastSyncedAt: '2026-01-01T15:30:00Z',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const sampleUser: User = {
  id: 'usr-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'collector@hoardex.app',
  phone: '',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AccountMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = sampleUser;
    mockSyncStatus = 'synced';
    useProfileStore.getState().clearProfile();
  });

  it('renders nothing when user is null (guest mode)', () => {
    mockUser = null;
    const { container } = renderWithRouter(<AccountMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('renders trigger button when user is authenticated', () => {
    renderWithRouter(<AccountMenu />);

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });
    expect(trigger).toBeDefined();
    expect(screen.getByText('collector@hoardex.app')).toBeDefined();
  });

  it('renders profile displayName and username when available in store', () => {
    useProfileStore.getState().setProfile({
      id: 'usr-123',
      username: 'gamer_pro',
      displayName: 'Gamer Pro',
      avatarUrl: null,
      bio: null,
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    renderWithRouter(<AccountMenu />);
    expect(screen.getByText('Gamer Pro')).toBeDefined();
  });

  it('toggles dropdown menu on click displaying actions and badges', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });
    await user.click(trigger);

    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Sincronizar ahora/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Hoardex Wrapped/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Editar perfil/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Cerrar sesión/i })).toBeDefined();
  });

  it('navigates to /u/:username when clicking Ver mi perfil público', async () => {
    useProfileStore.getState().setProfile({
      id: 'usr-123',
      username: 'alex',
      displayName: 'Alex',
      avatarUrl: null,
      bio: null,
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );

    const publicProfileBtn = screen.getByRole('menuitem', {
      name: /Ver mi perfil público/i,
    });
    await user.click(publicProfileBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/u/alex');
  });

  it('opens ProfileSettingsDialog when clicking Editar perfil', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );

    const editProfileBtn = screen.getByRole('menuitem', {
      name: /Editar perfil/i,
    });
    await user.click(editProfileBtn);

    expect(screen.getByRole('dialog', { name: /Editar perfil/i })).toBeDefined();
  });

  it('triggers manual synchronization on click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(
      screen.getByRole('menuitem', { name: /Sincronizar ahora/i })
    );

    expect(mockSyncNow).toHaveBeenCalled();
  });

  it('triggers sign out on click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('closes dropdown menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <div>
        <div data-testid="outside">Fuera</div>
        <AccountMenu />
      </div>
    );

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeDefined();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes dropdown menu when pressing Escape key', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens WrappedDialog when clicking Hoardex Wrapped in menu', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(
      screen.getByRole('menuitem', { name: /Hoardex Wrapped/i })
    );

    expect(screen.getByRole('dialog', { name: /Hoardex Wrapped/i })).toBeDefined();
  });

  it('exports catalog to CSV when clicking Exportar catálogo CSV in menu', async () => {
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-csv-url');
    const mockRevokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    renderWithRouter(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(
      screen.getByRole('menuitem', { name: /Exportar catálogo CSV/i })
    );

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Catálogo exportado a CSV correctamente');
    clickSpy.mockRestore();
  });
});
