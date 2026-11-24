import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CollectionCard } from './CollectionCard';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';

describe('CollectionCard component', () => {
  const sampleCollection: Collection = {
    id: 'col-1',
    name: 'Juegos de Mesa',
    description: 'Mi estantería de Eurogames',
    icon: 'Dice5',
    accentColor: '#10b981',
    provider: 'bgg',
    statuses: [
      { id: 'st-0', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'st-1', label: 'Jugado', isCompleted: true, order: 1 },
    ],
    isPublic: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const sampleItems: Item[] = [
    {
      id: 'itm-1',
      collectionId: 'col-1',
      title: 'Catan',
      statusId: 'st-1',
      xpAwarded: true,
      meta: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('renders title, description and completion progress', () => {
    render(
      <MemoryRouter>
        <CollectionCard collection={sampleCollection} items={sampleItems} />
      </MemoryRouter>
    );

    expect(screen.getByText('Juegos de Mesa')).toBeDefined();
    expect(screen.getByText('Mi estantería de Eurogames')).toBeDefined();
    expect(screen.getByText('1 / 1')).toBeDefined();
    expect(screen.queryByLabelText('Colección privada')).toBeNull();
  });

  it('renders Lock icon with aria-label when collection is private (isPublic === false)', () => {
    const privateCollection: Collection = {
      ...sampleCollection,
      isPublic: false,
    };

    render(
      <MemoryRouter>
        <CollectionCard collection={privateCollection} items={sampleItems} />
      </MemoryRouter>
    );

    const lockIcon = screen.getByLabelText('Colección privada');
    expect(lockIcon).toBeDefined();
  });
});
