export interface SearchResult {
  externalId: string;
  title: string;
  subtitle?: string;
  releaseYear?: number;
  coverUrl?: string;
  meta: Record<string, string | number | boolean>;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
