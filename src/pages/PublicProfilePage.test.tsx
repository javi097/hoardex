import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { toast } from 'sonner';
import { PublicProfilePage } from './PublicProfilePage';
import type { PublicProfileData } from '@/interfaces/user.interface';

let mockUsePublicProfileResult: {
  isLoading: boolean;
  notFound: boolean;
  isPrivate: boolean;
  isOwner: boolean;
  error: string | null;
  data: PublicProfileData | null;
  refetch: () => Promise<void>;
};

vi.mock('@/features/users/hooks/usePublicProfile', () => ({
  usePublicProfile: () => mockUsePublicProfileResult,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderProfilePage(initialUrl = '/u/alex') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/u/:username" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicProfilePage', () => {
  const samplePublicData: PublicProfileData = {
    profile: {
      id: 'usr-alex',
      username: 'alex',
      displayName: 'Alex Coleccionista',
      avatarUrl: 'https://example.com/alex.jpg',
      bio: 'Amante de los videojuegos RPG y libros de ciencia ficción.',
      isPublic: true,
      createdAt: '2025-05-10T12:00:00Z',
      updatedAt: '2025-05-10T12:00:00Z',
    },
    collections: [
      {
        id: 'col-1',
        name: 'Juegos RPG',
        description: 'Títulos favoritos de rol',
        icon: 'Gamepad2',
        accentColor: '#6366f1',
        provider: 'rawg',
        statuses: [
          { id: 'st-0', label: 'Pendiente', isCompleted: false, order: 0 },
          { id: 'st-1', label: 'Completado', isCompleted: true, order: 1 },
        ],
        isPublic: true,
        createdAt: '2025-05-10T12:00:00Z',
        updatedAt: '2025-05-10T12:00:00Z',
      },
      {
        id: 'col-2',
        name: 'Libros Sci-Fi',
        description: 'Colección de novela fantástica',
        icon: 'BookOpen',
        accentColor: '#10b981',
        provider: 'openLibrary',
        statuses: [
          { id: 'st-2', label: 'Leído', isCompleted: true, order: 0 },
        ],
        isPublic: true,
        createdAt: '2025-05-11T12:00:00Z',
        updatedAt: '2025-05-11T12:00:00Z',
      },
      {
        id: 'col-secret',
        name: 'Colección Privada Secreta',
        icon: 'Lock',
        accentColor: '#f43f5e',
        provider: 'manual',
        statuses: [],
        isPublic: false,
        createdAt: '2025-05-12T12:00:00Z',
        updatedAt: '2025-05-12T12:00:00Z',
      },
    ],
    items: [
      {
        id: 'itm-1',
        collectionId: 'col-1',
        title: 'Chrono Trigger',
        statusId: 'st-1',
        rating: 5,
        notes: 'Una obra maestra atemporal.',
        coverUrl: 'https://example.com/chrono.jpg',
        xpAwarded: true,
        meta: {},
        createdAt: '2025-05-10T12:00:00Z',
        updatedAt: '2025-05-10T12:00:00Z',
      },
      {
        id: 'itm-2',
        collectionId: 'col-2',
        title: 'Dune',
        statusId: 'st-2',
        rating: 5,
        coverUrl: 'https://example.com/dune.jpg',
        xpAwarded: true,
        meta: {},
        createdAt: '2025-05-11T12:00:00Z',
        updatedAt: '2025-05-11T12:00:00Z',
      },
      {
        id: 'itm-secret',
        collectionId: 'col-secret',
        title: 'Diario Secreto',
        statusId: 'none',
        xpAwarded: false,
        meta: {},
        createdAt: '2025-05-12T12:00:00Z',
        updatedAt: '2025-05-12T12:00:00Z',
      },
    ],
    gamification: {
      level: 4,
      levelTitle: 'Conservador de Reliquias',
      totalXp: 450,
      longestStreak: 12,
      unlockedAchievements: [
        {
          achievementId: 'first_item',
          unlockedAt: '2025-05-10T12:00:00Z',
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePublicProfileResult = {
      isLoading: false,
      notFound: false,
      isPrivate: false,
      isOwner: false,
      error: null,
      data: samplePublicData,
      refetch: vi.fn(),
    };
  });

  it('renders loading skeleton with aria-busy="true" while fetching', () => {
    mockUsePublicProfileResult = {
      ...mockUsePublicProfileResult,
      isLoading: true,
      data: null,
    };

    renderProfilePage('/u/alex');

    const skeleton = screen.getByRole('status', {
      name: /cargando perfil público/i,
    });
    expect(skeleton).toBeDefined();
    expect(skeleton.getAttribute('aria-busy')).toBe('true');
  });

  it('renders 404 empty state when user is not found', () => {
    mockUsePublicProfileResult = {
      ...mockUsePublicProfileResult,
      isLoading: false,
      notFound: true,
      data: null,
    };

    renderProfilePage('/u/nonexistent');

    expect(screen.getByText('Coleccionista no encontrado')).toBeDefined();
    expect(
      screen.getByText(/no hemos podido encontrar ningún perfil registrado con el identificador @nonexistent/i)
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /volver al inicio/i })).toBeDefined();
  });

  it('renders private profile empty state when profile is private and visitor is not owner', () => {
    mockUsePublicProfileResult = {
      ...mockUsePublicProfileResult,
      isLoading: false,
      isPrivate: true,
      isOwner: false,
      data: null,
    };

    renderProfilePage('/u/privateuser');

    expect(screen.getByText('Perfil privado')).toBeDefined();
    expect(
      screen.getByText(/el coleccionista ha decidido mantener su biblioteca oculta/i)
    ).toBeDefined();
  });

  it('renders owner preview banner when profile is private but viewer is owner (CL-03)', () => {
    mockUsePublicProfileResult = {
      ...mockUsePublicProfileResult,
      isLoading: false,
      isPrivate: false,
      isOwner: true,
      data: {
        ...samplePublicData,
        profile: {
          ...samplePublicData.profile,
          isPublic: false,
        },
      },
    };

    renderProfilePage('/u/alex');

    expect(
      screen.getByText(/vista previa de tu perfil \(privado para el resto del público\)/i)
    ).toBeDefined();
    expect(screen.getAllByRole('button', { name: /editar perfil/i }).length).toBeGreaterThan(0);
  });

  it('renders full public profile with identity, stats, collections, and achievements', () => {
    renderProfilePage('/u/alex');

    // Identidad
    expect(screen.getByText('Alex Coleccionista')).toBeDefined();
    expect(screen.getByText('@alex')).toBeDefined();
    expect(screen.getByText(/amante de los videojuegos rpg/i)).toBeDefined();
    expect(screen.getByText(/coleccionista desde 2025/i)).toBeDefined();

    // Métricas de gamificación
    expect(screen.getByText('Nivel 4')).toBeDefined();
    expect(screen.getByText('Conservador de Reliquias')).toBeDefined();
    expect(screen.getByText('450')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();

    // Colecciones públicas
    expect(screen.getByText('Juegos RPG')).toBeDefined();
    expect(screen.getByText('Libros Sci-Fi')).toBeDefined();

    // Ítems de la primera colección
    expect(screen.getByText('Chrono Trigger')).toBeDefined();
    expect(screen.getByText(/una obra maestra atemporal/i)).toBeDefined();

    // Vitrina de logros
    expect(screen.getByText('Primer ejemplar')).toBeDefined();
  });

  it('isolates private collections completely from the view', () => {
    renderProfilePage('/u/alex');

    // Colección privada no debe aparecer en tabs ni en pantalla
    expect(screen.queryByText('Colección Privada Secreta')).toBeNull();
    expect(screen.queryByText('Diario Secreto')).toBeNull();
  });

  it('allows switching active collection tab to view its items', () => {
    renderProfilePage('/u/alex');

    const scifiTab = screen.getByRole('tab', { name: /Libros Sci-Fi/i });
    fireEvent.click(scifiTab);

    // Dune now shown
    expect(screen.getByText('Dune')).toBeDefined();
    expect(screen.getByText('Colección de novela fantástica')).toBeDefined();
  });

  it('copies profile URL to clipboard when clicking Compartir perfil', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    renderProfilePage('/u/alex');

    const shareBtn = screen.getByRole('button', { name: /compartir perfil/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Enlace al perfil copiado');
    });
  });
});
