import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';
import type { Profile } from '@/interfaces/user.interface';

const mockSaveProfile = vi.fn();
let mockProfile: Profile | null = null;

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: mockProfile,
    isLoading: false,
    saveProfile: mockSaveProfile,
    refreshProfile: vi.fn(),
  }),
}));

describe('ProfileSettingsDialog component', () => {
  const initialProfile: Profile = {
    id: 'user-123',
    username: 'alex_gamer',
    displayName: 'Alex Gamer',
    avatarUrl: 'https://example.com/alex.jpg',
    bio: 'Coleccionista retro y de PC.',
    isPublic: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = { ...initialProfile };
    mockSaveProfile.mockResolvedValue({ success: true });
  });

  it('does not render dialog content when open is false', () => {
    render(<ProfileSettingsDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: /editar perfil/i })).toBeNull();
  });

  it('renders prefilled fields when open is true', () => {
    render(<ProfileSettingsDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /editar perfil/i })).toBeDefined();
    expect(screen.getByDisplayValue('Alex Gamer')).toBeDefined();
    expect(screen.getByDisplayValue('alex_gamer')).toBeDefined();
    expect(screen.getByDisplayValue('https://example.com/alex.jpg')).toBeDefined();
    expect(screen.getByDisplayValue('Coleccionista retro y de PC.')).toBeDefined();
    expect(screen.getByText('28/280')).toBeDefined();
  });

  it('shows validation error when username is invalid', async () => {
    render(<ProfileSettingsDialog open={true} onOpenChange={vi.fn()} />);

    const usernameInput = screen.getByDisplayValue('alex_gamer');
    fireEvent.change(usernameInput, { target: { value: 'AB' } }); // too short and uppercase

    expect(
      screen.getByText(/el nombre de usuario debe tener al menos 3 caracteres/i)
    ).toBeDefined();

    // Guardar button should be disabled
    const saveButton = screen.getByRole('button', { name: /guardar cambios/i });
    expect(saveButton.hasAttribute('disabled')).toBe(true);
  });

  it('toggles isPublic switch accessible state', () => {
    render(<ProfileSettingsDialog open={true} onOpenChange={vi.fn()} />);

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(switchBtn);
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(/perfil privado/i)).toBeDefined();
  });

  it('submits updated profile and calls onOpenChange(false) on success', async () => {
    const handleOpenChange = vi.fn();
    render(<ProfileSettingsDialog open={true} onOpenChange={handleOpenChange} />);

    const nameInput = screen.getByDisplayValue('Alex Gamer');
    fireEvent.change(nameInput, { target: { value: 'Alexander The Great' } });

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveProfile).toHaveBeenCalledWith({
        username: 'alex_gamer',
        displayName: 'Alexander The Great',
        avatarUrl: 'https://example.com/alex.jpg',
        bio: 'Coleccionista retro y de PC.',
        isPublic: true,
      });
    });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays form error when saveProfile fails', async () => {
    mockSaveProfile.mockResolvedValue({
      success: false,
      error: 'El nombre de usuario ya está en uso.',
    });

    render(<ProfileSettingsDialog open={true} onOpenChange={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText('El nombre de usuario ya está en uso.')
      ).toBeDefined();
    });
  });
});
