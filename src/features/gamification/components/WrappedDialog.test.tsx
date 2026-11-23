import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { WrappedDialog } from './WrappedDialog';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WrappedDialog', () => {
  const onOpenChange = vi.fn();
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  const mockCollections: Collection[] = [
    {
      id: 'col-1',
      name: 'Videojuegos 2026',
      icon: 'Gamepad2',
      accentColor: '#6366f1',
      provider: 'rawg',
      createdAt: '2026-01-01T00:00:00Z',
      statuses: [
        { id: 'st-pending', label: 'Pendiente', isCompleted: false, order: 1 },
        { id: 'st-completed', label: 'Terminado', isCompleted: true, order: 2 },
      ],
    },
  ];

  const mockItems: Item[] = [
    {
      id: 'item-1',
      collectionId: 'col-1',
      title: 'Zelda 2026',
      statusId: 'st-completed',
      xpAwarded: true,
      rating: 5,
      meta: {},
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-02-15T12:00:00Z',
    },
    {
      id: 'item-2',
      collectionId: 'col-1',
      title: 'Metroid 2026',
      statusId: 'st-pending',
      xpAwarded: true,
      rating: 4,
      meta: {},
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    useGamificationStore.getState().resetGamification();

    // Mock clipboard de forma segura
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      configurable: true,
      writable: true,
    });

    // Mock ObjectURL y click de descarga
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-svg-url');
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('renderiza el diálogo accesible cuando open es true', () => {
    render(<WrappedDialog open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Hoardex Wrapped');
  });

  it('muestra estado empático cuando no hay actividad registrada en el año seleccionado', () => {
    useCollectionsStore.setState({ collections: mockCollections });
    useItemsStore.setState({ items: [] });

    render(<WrappedDialog open={true} onOpenChange={onOpenChange} initialYear={2026} />);

    expect(screen.getByText(/Aún no hay actividad en 2026/i)).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Entendido, ir a catalogar/i })
    ).toBeDefined();
  });

  it('inicia en la Diapositiva 0 (Portada) cuando hay actividad y avanza con el botón Siguiente', async () => {
    useCollectionsStore.setState({ collections: mockCollections });
    useItemsStore.setState({ items: mockItems });
    const user = userEvent.setup();

    render(<WrappedDialog open={true} onOpenChange={onOpenChange} initialYear={2026} />);

    // Diapositiva 0
    expect(screen.getByText(/Tu Año en Colección/i)).toBeDefined();
    expect(screen.getByText('1 de 6')).toBeDefined();

    // Botón Anterior deshabilitado en primera diapositiva
    const prevButton = screen.getByRole('button', { name: /Anterior/i });
    expect((prevButton as HTMLButtonElement).disabled).toBe(true);

    // Avanzar a Diapositiva 1
    const nextButton = screen.getByRole('button', { name: /Siguiente/i });
    await user.click(nextButton);

    // Diapositiva 1: Volumen de Colección
    expect(screen.getByText(/Sumaste 2 nuevos tesoros/i)).toBeDefined();
    expect(screen.getByText('2 de 6')).toBeDefined();
    expect((prevButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('permite navegar mediante las flechas del teclado ArrowRight y ArrowLeft', () => {
    useCollectionsStore.setState({ collections: mockCollections });
    useItemsStore.setState({ items: mockItems });

    render(<WrappedDialog open={true} onOpenChange={onOpenChange} initialYear={2026} />);

    expect(screen.getByText('1 de 6')).toBeDefined();

    // Pulsar ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 de 6')).toBeDefined();

    // Pulsar ArrowLeft
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('1 de 6')).toBeDefined();
  });

  it('alcanza la diapositiva final The Recap Card y permite copiar el resumen', async () => {
    useCollectionsStore.setState({ collections: mockCollections });
    useItemsStore.setState({ items: mockItems });

    render(<WrappedDialog open={true} onOpenChange={onOpenChange} initialYear={2026} />);

    // Avanzar 5 veces hasta la última diapositiva
    for (let i = 0; i < 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      fireEvent.click(nextBtn);
    }

    expect(screen.getByText('6 de 6')).toBeDefined();
    expect(screen.getByText(/Tu Resumen Consolidado 2026/i)).toBeDefined();

    // Botón Copiar Resumen
    const copyBtn = screen.getByRole('button', { name: /Copiar resumen/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('¡Resumen copiado al portapapeles!');
    });
  });

  it('permite descargar la tarjeta vectorial SVG desde la diapositiva final', () => {
    useCollectionsStore.setState({ collections: mockCollections });
    useItemsStore.setState({ items: mockItems });

    render(<WrappedDialog open={true} onOpenChange={onOpenChange} initialYear={2026} />);

    // Ir a la última diapositiva
    for (let i = 0; i < 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      fireEvent.click(nextBtn);
    }

    const downloadBtn = screen.getByRole('button', { name: /Descargar tarjeta/i });
    fireEvent.click(downloadBtn);

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Tarjeta Wrapped descargada con éxito.');
  });

  it('cierra el diálogo al pulsar el botón Finalizar Wrapped en la diapositiva final', () => {
    useCollectionsStore.setState({ collections: mockCollections });
    useItemsStore.setState({ items: mockItems });

    render(<WrappedDialog open={true} onOpenChange={onOpenChange} initialYear={2026} />);

    // Ir a la diapositiva final
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    }

    // El botón Siguiente se transforma en Finalizar Wrapped
    const closeBtn = screen.getByRole('button', { name: /Finalizar Wrapped/i });
    fireEvent.click(closeBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
