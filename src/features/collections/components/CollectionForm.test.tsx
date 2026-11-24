import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionForm } from './CollectionForm';

describe('CollectionForm component', () => {
  it('submits with isPublic true by default', () => {
    const handleSubmit = vi.fn();
    render(<CollectionForm onSubmit={handleSubmit} />);

    const nameInput = screen.getByLabelText(/nombre de la colección \*/i);
    fireEvent.change(nameInput, { target: { value: 'Mi Colección' } });

    const submitBtn = screen.getByRole('button', { name: /guardar colección/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mi Colección',
        isPublic: true,
      })
    );
  });

  it('initializes with initialValues isPublic if provided', () => {
    const handleSubmit = vi.fn();
    render(
      <CollectionForm
        initialValues={{ name: 'Colección Secreta', isPublic: false }}
        onSubmit={handleSubmit}
      />
    );

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Colección privada')).toBeDefined();

    const submitBtn = screen.getByRole('button', { name: /guardar colección/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Colección Secreta',
        isPublic: false,
      })
    );
  });

  it('toggles isPublic switch state on click', () => {
    const handleSubmit = vi.fn();
    render(
      <CollectionForm
        initialValues={{ name: 'Colección Pública' }}
        onSubmit={handleSubmit}
      />
    );

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(switchBtn);
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Colección privada')).toBeDefined();

    const submitBtn = screen.getByRole('button', { name: /guardar colección/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Colección Pública',
        isPublic: false,
      })
    );
  });

  it('validates required name field before submission', () => {
    const handleSubmit = vi.fn();
    render(<CollectionForm onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /guardar colección/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('El nombre de la colección es obligatorio.')).toBeDefined();
  });
});
