import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
} from '@/interfaces/provider.interface';

export const manualProvider: SearchProvider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    return [];
  },
};
