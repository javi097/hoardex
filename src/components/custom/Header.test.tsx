import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { Header } from './Header';
import type { User } from '@supabase/supabase-js';

let mockUser: User | null = null;
let mockIsConfigured = true;

vi.mock('@/features/sync/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isSupabaseConfigured: mockIsConfigured,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/features/sync/hooks/useSyncEngine', () => ({
  useSyncEngine: () => ({
    syncNow: vi.fn(),
    syncStatus: 'synced',
    lastSyncedAt: null,
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
  id: 'user-header',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'tester@hoardex.app',
  phone: '',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockIsConfigured = true;
  });

  it('renders brand logo and navigation in guest mode', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText('Hoardex')).toBeDefined();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Exportar copia de seguridad/i })
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Restaurar copia de seguridad/i })
    ).toBeDefined();
  });

  it('opens AuthDialog when clicking Iniciar sesión', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const loginBtn = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(loginBtn);

    expect(
      screen.getByRole('dialog', { name: /Iniciar sesión/i })
    ).toBeDefined();
  });

  it('opens ImportBackupDialog when clicking Restaurar copia de seguridad', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const restoreBtn = screen.getByRole('button', {
      name: /Restaurar copia de seguridad/i,
    });
    await user.click(restoreBtn);

    expect(
      screen.getByRole('dialog', { name: /Restaurar copia de seguridad/i })
    ).toBeDefined();
  });

  it('renders AccountMenu and hides Iniciar sesión when user is authenticated', () => {
    mockUser = sampleUser;

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /Iniciar sesión/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: /Menú de cuenta y sincronización/i })
    ).toBeDefined();
    expect(screen.getByText('tester@hoardex.app')).toBeDefined();
  });

  it('does not render Iniciar sesión button when Supabase is not configured', () => {
    mockIsConfigured = false;
    mockUser = null;

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /Iniciar sesión/i })).toBeNull();
    // Pero sí muestra botones para backup local
    expect(
      screen.getByRole('button', { name: /Exportar copia de seguridad/i })
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Restaurar copia de seguridad/i })
    ).toBeDefined();
  });

  it('opens WrappedDialog when clicking Wrapped button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const wrappedBtn = screen.getByRole('button', { name: /Ver Hoardex Wrapped/i });
    await user.click(wrappedBtn);

    expect(
      screen.getByRole('dialog', { name: /Hoardex Wrapped/i })
    ).toBeDefined();
  });

  it('exports catalog to CSV when clicking Exportar catálogo a CSV in guest mode', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-csv');
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const csvBtn = screen.getByRole('button', { name: /Exportar catálogo a CSV/i });
    await user.click(csvBtn);

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Catálogo exportado a CSV correctamente');
  });
});
