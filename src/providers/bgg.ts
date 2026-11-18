import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
} from '@/interfaces/provider.interface';

export function parseBggXml(xmlString: string): SearchResult[] {
  if (!xmlString.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Error al interpretar el XML de BoardGameGeek.');
  }

  const items = xmlDoc.querySelectorAll('item');
  const results: SearchResult[] = [];

  for (let i = 0; i < items.length && results.length < 10; i++) {
    const item = items[i];
    const id = item.getAttribute('id');
    if (!id) {
      continue;
    }

    const primaryName =
      item.querySelector('name[type="primary"]') ?? item.querySelector('name');
    const title = primaryName?.getAttribute('value') ?? 'Sin título';

    const yearNode = item.querySelector('yearpublished');
    const yearRaw = yearNode?.getAttribute('value');
    let releaseYear: number | undefined;
    if (yearRaw) {
      const parsed = parseInt(yearRaw, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        releaseYear = parsed;
      }
    }

    const meta: Record<string, string | number | boolean> = {
      bggId: id,
      type: item.getAttribute('type') ?? 'boardgame',
    };

    results.push({
      externalId: id,
      title,
      subtitle: 'Juego de mesa',
      releaseYear,
      coverUrl: undefined,
      meta,
    });
  }

  return results;
}

export const bggProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const endpoint = `/api/bgg/search?query=${encodeURIComponent(
      cleanQuery
    )}&type=boardgame`;

    const token = import.meta.env.VITE_BGG_API_TOKEN as string | undefined;
    const headers: Record<string, string> = {};
    if (token && token.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    try {
      const response = await fetch(endpoint, {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        signal: options?.signal,
      });

      if (!response.ok) {
        throw new Error(
          'No se pudo conectar con BoardGameGeek (posible restricción CORS, token o bloqueo). Puedes añadir el juego mediante Alta manual.'
        );
      }

      const xmlText = await response.text();
      return parseBggXml(xmlText);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        throw error;
      }
      if (
        error instanceof Error &&
        error.message.startsWith('No se pudo conectar con BoardGameGeek')
      ) {
        throw error;
      }
      throw new Error(
        'No se pudo conectar con BoardGameGeek (posible restricción CORS, token o bloqueo). Puedes añadir el juego mediante Alta manual.',
        { cause: error }
      );
    }
  },
};
