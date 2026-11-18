import type { ProviderType } from '@/interfaces/collection.interface';
import type { SearchProvider } from '@/interfaces/provider.interface';
import { bggProvider } from './bgg';
import { manualProvider } from './manual';
import { mockProvider } from './mock';
import { openLibraryProvider } from './openLibrary';
import { rawgProvider } from './rawg';

export { bggProvider } from './bgg';
export { manualProvider } from './manual';
export { mockProvider } from './mock';
export { openLibraryProvider } from './openLibrary';
export { rawgProvider } from './rawg';

export function getSearchProvider(type: ProviderType): SearchProvider {
  switch (type) {
    case 'rawg':
      return rawgProvider;
    case 'openLibrary':
      return openLibraryProvider;
    case 'bgg':
      return bggProvider;
    case 'manual':
      return manualProvider;
    default:
      return mockProvider;
  }
}
