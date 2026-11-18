import { describe, expect, it } from 'vitest';
import type { ProviderType } from '@/interfaces/collection.interface';
import { bggProvider } from './bgg';
import { getSearchProvider } from './index';
import { manualProvider } from './manual';
import { mockProvider } from './mock';
import { openLibraryProvider } from './openLibrary';
import { rawgProvider } from './rawg';

describe('getSearchProvider', () => {
  it('resolves rawgProvider for type "rawg"', () => {
    const provider = getSearchProvider('rawg');
    expect(provider).toBe(rawgProvider);
  });

  it('resolves openLibraryProvider for type "openLibrary"', () => {
    const provider = getSearchProvider('openLibrary');
    expect(provider).toBe(openLibraryProvider);
  });

  it('resolves bggProvider for type "bgg"', () => {
    const provider = getSearchProvider('bgg');
    expect(provider).toBe(bggProvider);
  });

  it('resolves manualProvider for type "manual" and returns empty array on search', async () => {
    const provider = getSearchProvider('manual');
    expect(provider).toBe(manualProvider);

    const results = await provider.search('cualquier texto');
    expect(results).toEqual([]);
  });

  it('falls back safely to mockProvider for unknown provider types without using any', () => {
    const unknownType = 'unknown' as ProviderType;
    const provider = getSearchProvider(unknownType);
    expect(provider).toBe(mockProvider);
  });
});
