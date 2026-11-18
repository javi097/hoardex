import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
} from '@/interfaces/provider.interface';

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  publisher?: string[];
  number_of_pages_median?: number;
}

export interface OpenLibraryResponse {
  numFound: number;
  start: number;
  docs: OpenLibraryDoc[];
}

export function normalizeOpenLibraryDoc(doc: OpenLibraryDoc): SearchResult {
  const authors = doc.author_name?.filter(Boolean) ?? [];
  const subtitle = authors.length > 0 ? authors.slice(0, 2).join(', ') : undefined;

  const releaseYear =
    typeof doc.first_publish_year === 'number' && doc.first_publish_year > 0
      ? doc.first_publish_year
      : undefined;

  const coverUrl =
    typeof doc.cover_i === 'number' && doc.cover_i > 0
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined;

  const meta: Record<string, string | number | boolean> = {
    openLibraryKey: doc.key,
  };

  if (authors.length > 0) {
    meta.authors = authors.join(', ');
  }
  if (doc.publisher?.[0]) {
    meta.publisher = doc.publisher[0];
  }
  if (typeof doc.number_of_pages_median === 'number') {
    meta.pages = doc.number_of_pages_median;
  }

  return {
    externalId: doc.key,
    title: doc.title,
    subtitle,
    releaseYear,
    coverUrl,
    meta,
  };
}

const OPEN_LIBRARY_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'cover_i',
  'publisher',
  'number_of_pages_median',
].join(',');

export const openLibraryProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(
      cleanQuery
    )}&limit=10&fields=${OPEN_LIBRARY_FIELDS}`;

    const response = await fetch(endpoint, {
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Error al consultar Open Library (código HTTP ${response.status}).`);
    }

    const data = (await response.json()) as OpenLibraryResponse;
    return (data.docs ?? []).map(normalizeOpenLibraryDoc);
  },
};
