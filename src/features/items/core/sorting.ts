import type {
  Item,
  ItemFilters,
  ItemSortOption,
} from '@/interfaces/item.interface';

export const ITEM_SORT_OPTIONS: ItemSortOption[] = [
  {
    id: 'createdAt-desc',
    field: 'createdAt',
    direction: 'desc',
    label: 'Más recientes',
  },
  {
    id: 'createdAt-asc',
    field: 'createdAt',
    direction: 'asc',
    label: 'Más antiguos',
  },
  {
    id: 'title-asc',
    field: 'title',
    direction: 'asc',
    label: 'Título (A - Z)',
  },
  {
    id: 'title-desc',
    field: 'title',
    direction: 'desc',
    label: 'Título (Z - A)',
  },
  {
    id: 'releaseYear-desc',
    field: 'releaseYear',
    direction: 'desc',
    label: 'Año (más reciente)',
  },
  {
    id: 'releaseYear-asc',
    field: 'releaseYear',
    direction: 'asc',
    label: 'Año (más antiguo)',
  },
  {
    id: 'rating-desc',
    field: 'rating',
    direction: 'desc',
    label: 'Mejor valorados',
  },
];

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterAndSortItems(
  items: Item[],
  filters: ItemFilters,
  sort: ItemSortOption
): Item[] {
  const cleanQuery = normalizeText(filters.query);

  // 1. Filtrado
  const filtered = items.filter((item) => {
    // Filtro por estado
    if (filters.statusId && filters.statusId !== 'all') {
      if (item.statusId !== filters.statusId) {
        return false;
      }
    }

    // Filtro por texto
    if (cleanQuery) {
      const matchTitle = normalizeText(item.title).includes(cleanQuery);
      const matchSubtitle = item.subtitle
        ? normalizeText(item.subtitle).includes(cleanQuery)
        : false;
      if (!matchTitle && !matchSubtitle) {
        return false;
      }
    }

    return true;
  });

  // 2. Ordenación inmutable
  return [...filtered].sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1;

    switch (sort.field) {
      case 'title': {
        const titleA = normalizeText(a.title);
        const titleB = normalizeText(b.title);
        return titleA.localeCompare(titleB, 'es') * dir;
      }

      case 'releaseYear': {
        // Los ítems sin año se posicionan siempre al final
        if (a.releaseYear === undefined && b.releaseYear === undefined) {
          return 0;
        }
        if (a.releaseYear === undefined) {
          return 1;
        }
        if (b.releaseYear === undefined) {
          return -1;
        }
        return (a.releaseYear - b.releaseYear) * dir;
      }

      case 'rating': {
        // Los ítems sin valoración se posicionan siempre al final
        if (a.rating === undefined && b.rating === undefined) {
          return 0;
        }
        if (a.rating === undefined) {
          return 1;
        }
        if (b.rating === undefined) {
          return -1;
        }
        return (a.rating - b.rating) * dir;
      }

      case 'createdAt':
      default: {
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
      }
    }
  });
}

export interface UpdateItemDetailsPatch {
  title?: string;
  subtitle?: string;
  releaseYear?: number;
  coverUrl?: string;
  rating?: number;
  notes?: string;
  statusId?: string;
  reviewXpAwarded?: boolean;
}

export function updateItemDetails(
  item: Item,
  patch: UpdateItemDetailsPatch,
  now: string
): Item {
  return {
    ...item,
    ...patch,
    updatedAt: now,
  };
}
