import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ImportBackupDialog } from './ImportBackupDialog';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { useSyncStore } from '@/features/sync/store/sync.store';
import type { HoardexBackup } from '@/interfaces/sync.interface';

const mockSyncNow = vi.fn();

vi.mock('@/features/sync/hooks/useSyncEngine', () => ({
  useSyncEngine: () => ({
    syncNow: mockSyncNow,
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

describe('ImportBackupDialog', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    useGamificationStore.getState().resetGamification();
    useSyncStore.getState().resetSyncState();
  });

  const validBackup: HoardexBackup = {
    version: 1,
    exportedAt: '2026-01-01T12:00:00Z',
    collections: [
      {
        id: 'col-1',
        name: 'Videojuegos Retro',
        icon: 'Gamepad2',
        accentColor: '#6366f1',
        provider: 'rawg',
        statuses: [
          { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
        ],
        createdAt: '2026-01-01T12:00:00Z',
      },
    ],
    items: [
      {
        id: 'it-1',
        collectionId: 'col-1',
        title: 'Chrono Trigger',
        statusId: 'st-1',
        xpAwarded: false,
        meta: {},
        createdAt: '2026-01-01T12:00:00Z',
        updatedAt: '2026-01-01T12:00:00Z',
      },
    ],
    gamification: {
      totalXp: 250,
      streak: {
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: '2026-01-01',
        isActiveToday: true,
      },
      unlockedAchievements: [],
      claimedChallengeIds: [],
      rewardedCollectionIds: [],
      xpHistory: [],
    },
  };

  it('renders modal with drag and drop zone when open is true', () => {
    render(<ImportBackupDialog open={true} onOpenChange={onOpenChange} />);

    expect(
      screen.getByRole('heading', { name: /Restaurar copia de seguridad/i })
    ).toBeDefined();
    expect(screen.getByText(/Arrastra tu archivo aquí/i)).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Restaurar datos/i })
    ).toHaveProperty('disabled', true);
  });

  it('rejects non-json files with an error message', async () => {
    render(<ImportBackupDialog open={true} onOpenChange={onOpenChange} />);

    const file = new File(['hello'], 'document.pdf', {
      type: 'application/pdf',
    });
    const input = screen.getByTestId('backup-file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(
        screen.getByText(/El archivo debe tener extensión \.json/i)
      ).toBeDefined();
    });
  });

  it('rejects corrupt json files', async () => {
    render(<ImportBackupDialog open={true} onOpenChange={onOpenChange} />);

    const file = new File(['{ invalid json ...'], 'corrupt.json', {
      type: 'application/json',
    });
    const input = screen.getByTestId('backup-file-input');

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(
        screen.getByText(/El archivo no contiene un JSON válido/i)
      ).toBeDefined();
    });
  });

  it('rejects invalid backup schema missing required fields', async () => {
    render(<ImportBackupDialog open={true} onOpenChange={onOpenChange} />);

    const invalidData = { version: 2, collections: [] };
    const file = new File([JSON.stringify(invalidData)], 'wrong-version.json', {
      type: 'application/json',
    });
    const input = screen.getByTestId('backup-file-input');

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  it('processes valid backup, displays summary and restores data upon confirmation', async () => {
    const user = userEvent.setup();
    render(<ImportBackupDialog open={true} onOpenChange={onOpenChange} />);

    const file = new File([JSON.stringify(validBackup)], 'hoardex-backup.json', {
      type: 'application/json',
    });
    const input = screen.getByTestId('backup-file-input');

    await user.upload(input, file);

    // Esperar al resumen validado
    await waitFor(() => {
      expect(screen.getByText(/Copia de seguridad válida/i)).toBeDefined();
    });

    // 1 colección y 1 ítem -> 2 elementos con '1'
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('250')).toBeDefined(); // 250 XP

    const restoreBtn = screen.getByRole('button', { name: /Restaurar datos/i });
    expect(restoreBtn).toHaveProperty('disabled', false);

    await user.click(restoreBtn);

    // Verificar hidratación en los stores
    expect(useCollectionsStore.getState().collections).toHaveLength(1);
    expect(useCollectionsStore.getState().collections[0].name).toBe(
      'Videojuegos Retro'
    );
    expect(useItemsStore.getState().items).toHaveLength(1);
    expect(useItemsStore.getState().items[0].title).toBe('Chrono Trigger');
    expect(useGamificationStore.getState().totalXp).toBe(250);

    // Notificación toast
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Copia de seguridad restaurada con éxito')
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('triggers syncNow if user is authenticated when restoring', async () => {
    const user = userEvent.setup();
    useSyncStore.getState().setUser({
      id: 'user-789',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
      email: 'user@test.com',
      phone: '',
      role: 'authenticated',
      updated_at: '',
    });

    render(<ImportBackupDialog open={true} onOpenChange={onOpenChange} />);

    const file = new File([JSON.stringify(validBackup)], 'backup.json', {
      type: 'application/json',
    });
    const input = screen.getByTestId('backup-file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Copia de seguridad válida/i)).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Restaurar datos/i }));

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });
});
