export interface CollectionStatus {
  id: string;
  label: string;
  isCompleted: boolean;
  order: number;
}

export type ProviderType = 'manual' | 'rawg' | 'openLibrary' | 'bgg';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon: string;
  accentColor: string;
  provider: ProviderType;
  statuses: CollectionStatus[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CollectionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  provider: ProviderType;
  defaultStatuses: CollectionStatus[];
}

export interface CreateCollectionParams {
  name: string;
  description?: string;
  icon: string;
  accentColor: string;
  provider: ProviderType;
  statuses: CollectionStatus[];
  isPublic?: boolean;
}

export interface UpdateCollectionParams {
  name?: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  provider?: ProviderType;
  statuses?: CollectionStatus[];
  isPublic?: boolean;
}
