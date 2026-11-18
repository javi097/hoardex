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
  meta: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
