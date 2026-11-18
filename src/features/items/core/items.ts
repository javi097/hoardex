import type { Item } from '@/interfaces/item.interface';
import type { SearchResult } from '@/interfaces/provider.interface';

export interface CreateItemFromSearchResultParams {
  collectionId: string;
  result: SearchResult;
  initialStatusId: string;
  now: string;
}

export interface CreateItemManualParams {
  collectionId: string;
  title: string;
  subtitle?: string;
  releaseYear?: number;
  coverUrl?: string;
  initialStatusId: string;
  meta?: Record<string, string | number | boolean>;
  now: string;
}

export function createItemFromSearchResult(
  params: CreateItemFromSearchResultParams
): Item {
  return {
    id: crypto.randomUUID(),
    collectionId: params.collectionId,
    externalId: params.result.externalId,
    title: params.result.title,
    subtitle: params.result.subtitle,
    releaseYear: params.result.releaseYear,
    coverUrl: params.result.coverUrl,
    statusId: params.initialStatusId,
    xpAwarded: false,
    meta: { ...params.result.meta },
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function createItemManual(params: CreateItemManualParams): Item {
  return {
    id: crypto.randomUUID(),
    collectionId: params.collectionId,
    title: params.title,
    subtitle: params.subtitle,
    releaseYear: params.releaseYear,
    coverUrl: params.coverUrl,
    statusId: params.initialStatusId,
    xpAwarded: false,
    meta: params.meta ? { ...params.meta } : {},
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export function changeItemStatus(
  item: Item,
  newStatusId: string,
  isCompleted: boolean,
  now: string
): Item {
  return {
    ...item,
    statusId: newStatusId,
    updatedAt: now,
    completedAt: isCompleted && !item.completedAt ? now : item.completedAt,
    xpAwarded: item.xpAwarded || isCompleted,
  };
}
