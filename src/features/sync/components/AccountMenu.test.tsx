import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { AccountMenu } from './AccountMenu';
import type { User } from '@supabase/supabase-js';

const mockSignOut = vi.fn();
const mockSyncNow = vi.fn();
let mockUser: User | null = null;
let mockSyncStatus = 'synced';

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

describe('AccountMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = sampleUser;
    mockSyncStatus = 'synced';
  });

  it('renders nothing when user is null (guest mode)', () => {
    mockUser = null;
    const { container } = render(<AccountMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('renders trigger button when user is authenticated', () => {
    render(<AccountMenu />);

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });
    expect(trigger).toBeDefined();
    expect(screen.getByText('collector@hoardex.app')).toBeDefined();
  });

  it('toggles dropdown menu on click displaying actions and badges', async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });

    // Abrir menú
    await user.click(trigger);

    expect(screen.getByRole('menu', { name: /Opciones de cuenta/i })).toBeDefined();
    expect(screen.getByText(/Sincronizado/i)).toBeDefined();
    expect(
      screen.getByRole('menuitem', { name: /Sincronizar ahora/i })
    ).toBeDefined();
    expect(
      screen.getByRole('menuitem', { name: /Exportar copia de seguridad/i })
    ).toBeDefined();
    expect(
      screen.getByRole('menuitem', { name: /Restaurar copia de seguridad/i })
    ).toBeDefined();
    expect(
      screen.getByRole('menuitem', { name: /Cerrar sesión/i })
    ).toBeDefined();
  });

  it('triggers syncNow when clicking Sincronizar ahora', async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(
      screen.getByRole('menuitem', { name: /Sincronizar ahora/i })
    );

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });

  it('triggers signOut when clicking Cerrar sesión', async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('triggers backup export download and emits toast', async () => {
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<AccountMenu />);

    await user.click(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    );
    await user.click(
      screen.getByRole('menuitem', { name: /Exportar copia de seguridad/i })
    );

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Copia de seguridad descargada.');
    clickSpy.mockRestore();
  });

  it('closes dropdown menu when pressing Escape key', async () => {
    const user = userEvent.setup();
    render(<AccountMenu />);

    const trigger = screen.getByRole('button', {
      name: /Menú de cuenta y sincronización/i,
    });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
