export interface Item {
  id: string;
  collectionId: string;
  externalId?: string;
  title: string;
  subtitle?: string;
  releaseYear?: number;
  coverUrl?: string;
  statusId: string;
  xpAwarded: boolean;
  rating?: number;
  notes?: string;
  meta: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type ItemSortField = 'createdAt' | 'title' | 'releaseYear' | 'rating';
export type SortDirection = 'asc' | 'desc';

export interface ItemSortOption {
  id: string;
  field: ItemSortField;
  direction: SortDirection;
  label: string;
}

export interface ItemFilters {
  query: string;
  statusId: string;
}
