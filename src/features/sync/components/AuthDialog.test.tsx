import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { AuthDialog } from './AuthDialog';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock('@/features/sync/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: vi.fn(),
    user: null,
    isSupabaseConfigured: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AuthDialog', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal dialog when open is true', () => {
    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeDefined();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeDefined();
    expect(screen.getByLabelText(/Contraseña/i)).toBeDefined();
  });

  it('switches between Iniciar sesión and Crear cuenta modes', async () => {
    const user = userEvent.setup();
    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

    const signUpTab = screen.getByRole('tab', { name: /Crear cuenta/i });
    await user.click(signUpTab);

    expect(screen.getByRole('heading', { name: /Crear cuenta/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Registrarme/i })).toBeDefined();

    const signInTab = screen.getByRole('tab', { name: /Iniciar sesión/i });
    await user.click(signInTab);

    expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeDefined();
  });

  it('validates password length on client before submission', async () => {
    const user = userEvent.setup();
    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@hoardex.app');
    await user.type(screen.getByLabelText(/Contraseña/i), '123'); // < 6 caracteres
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(
      screen.getByText(/La contraseña debe tener al menos 6 caracteres/i)
    ).toBeDefined();
  });

  it('submits signIn and closes dialog on success', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ success: true });

    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'user@hoardex.app');
    await user.type(screen.getByLabelText(/Contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    expect(mockSignIn).toHaveBeenCalledWith('user@hoardex.app', 'secret123');
    expect(toast.success).toHaveBeenCalledWith('¡Bienvenido de nuevo a Hoardex!');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays error message when signIn fails', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      success: false,
      error: 'Credenciales inválidas',
    });

    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'user@hoardex.app');
    await user.type(screen.getByLabelText(/Contraseña/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    expect(mockSignIn).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Credenciales inválidas')).toBeDefined();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('submits signUp and handles success in create account mode', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ success: true });

    render(
      <AuthDialog
        open={true}
        onOpenChange={onOpenChange}
        initialMode="signUp"
      />
    );

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'new@hoardex.app');
    await user.type(screen.getByLabelText(/Contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /Registrarme/i }));

    expect(mockSignUp).toHaveBeenCalledWith('new@hoardex.app', 'secret123');
    expect(toast.success).toHaveBeenCalledWith(
      'Cuenta creada con éxito. ¡Sesión iniciada!'
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
