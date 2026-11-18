import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeOpenLibraryDoc,
  type OpenLibraryDoc,
  openLibraryProvider,
} from './openLibrary';

describe('normalizeOpenLibraryDoc', () => {
  it('normalizes a complete document with all metadata and authors', () => {
    const mockDoc: OpenLibraryDoc = {
      key: '/works/OL45804W',
      title: 'Cien años de soledad',
      author_name: ['Gabriel García Márquez', 'Traductor Ilustre', 'Colaborador Opcional'],
      first_publish_year: 1967,
      cover_i: 8231856,
      publisher: ['Editorial Sudamericana'],
      number_of_pages_median: 417,
    };

    const result = normalizeOpenLibraryDoc(mockDoc);

    expect(result.externalId).toBe('/works/OL45804W');
    expect(result.title).toBe('Cien años de soledad');
    expect(result.subtitle).toBe('Gabriel García Márquez, Traductor Ilustre');
    expect(result.releaseYear).toBe(1967);
    expect(result.coverUrl).toBe('https://covers.openlibrary.org/b/id/8231856-M.jpg');
    expect(result.meta).toEqual({
      openLibraryKey: '/works/OL45804W',
      authors: 'Gabriel García Márquez, Traductor Ilustre, Colaborador Opcional',
      publisher: 'Editorial Sudamericana',
      pages: 417,
    });
  });

  it('normalizes document with missing optional fields to undefined', () => {
    const incompleteDoc: OpenLibraryDoc = {
      key: '/works/OL999W',
      title: 'Manuscrito Desconocido',
    };

    const result = normalizeOpenLibraryDoc(incompleteDoc);

    expect(result.externalId).toBe('/works/OL999W');
    expect(result.title).toBe('Manuscrito Desconocido');
    expect(result.subtitle).toBeUndefined();
    expect(result.releaseYear).toBeUndefined();
    expect(result.coverUrl).toBeUndefined();
    expect(result.meta).toEqual({
      openLibraryKey: '/works/OL999W',
    });
  });

  it('handles non-positive years or cover IDs as undefined', () => {
    const invalidDoc: OpenLibraryDoc = {
      key: '/works/OL111W',
      title: 'Fantasía Histórica',
      first_publish_year: 0,
      cover_i: -12,
    };

    const result = normalizeOpenLibraryDoc(invalidDoc);

    expect(result.releaseYear).toBeUndefined();
    expect(result.coverUrl).toBeUndefined();
  });
});

describe('openLibraryProvider.search', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array immediately if query is empty or whitespace', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const emptyResult = await openLibraryProvider.search('');
    const whitespaceResult = await openLibraryProvider.search('   ');

    expect(emptyResult).toEqual([]);
    expect(whitespaceResult).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('queries Open Library with encoded query, limit=10 and fields without custom User-Agent', async () => {
    const mockDocs: OpenLibraryDoc[] = [
      {
        key: '/works/OL1000W',
        title: 'Dune',
        author_name: ['Frank Herbert'],
        first_publish_year: 1965,
        cover_i: 123456,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ numFound: 1, start: 0, docs: mockDocs }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const results = await openLibraryProvider.search('Dune & Messiah');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://openlibrary.org/search.json?');
    expect(calledUrl).toContain(`q=${encodeURIComponent('Dune & Messiah')}`);
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('fields=key,title,author_name,first_publish_year,cover_i,publisher,number_of_pages_median');

    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe('/works/OL1000W');
    expect(results[0].title).toBe('Dune');
    expect(results[0].subtitle).toBe('Frank Herbert');
    expect(results[0].releaseYear).toBe(1965);
    expect(results[0].coverUrl).toBe('https://covers.openlibrary.org/b/id/123456-M.jpg');
  });

  it('passes AbortSignal to fetch for cancellation', async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ numFound: 0, start: 0, docs: [] }),
      } as unknown as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    await openLibraryProvider.search('Foundation', { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('throws informative error message on non-ok HTTP responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(openLibraryProvider.search('Error Book')).rejects.toThrow(
      'Error al consultar Open Library (código HTTP 500).'
    );
  });
});
