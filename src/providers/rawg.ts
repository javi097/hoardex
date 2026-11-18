import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
} from '@/interfaces/provider.interface';

export interface RawgPlatform {
  platform: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface RawgGenre {
  id: number;
  name: string;
}

export interface RawgGame {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  platforms?: RawgPlatform[] | null;
  genres?: RawgGenre[] | null;
  rating?: number;
}

export interface RawgResponse {
  count: number;
  results: RawgGame[];
}

export function normalizeRawgGame(game: RawgGame): SearchResult {
  let releaseYear: number | undefined;
  if (game.released) {
    const yearParsed = parseInt(game.released.slice(0, 4), 10);
    if (Number.isInteger(yearParsed) && yearParsed > 0) {
      releaseYear = yearParsed;
    }
  }

  const platformsList = game.platforms?.map((p) => p.platform.name).filter(Boolean) ?? [];
  const subtitle = platformsList.length > 0 ? platformsList.slice(0, 3).join(', ') : undefined;

  const meta: Record<string, string | number | boolean> = {
    rawgId: game.id,
  };
  if (platformsList.length > 0) {
    meta.platforms = platformsList.join(', ');
  }
  const genresList = game.genres?.map((g) => g.name).filter(Boolean) ?? [];
  if (genresList.length > 0) {
    meta.genres = genresList.join(', ');
  }
  if (typeof game.rating === 'number') {
    meta.rating = game.rating;
  }

  return {
    externalId: String(game.id),
    title: game.name,
    subtitle,
    releaseYear,
    coverUrl: game.background_image || undefined,
    meta,
  };
}

export const rawgProvider: SearchProvider = {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const apiKey = import.meta.env.VITE_RAWG_API_KEY as string | undefined;
    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        'Clave de API de RAWG no configurada. Configura VITE_RAWG_API_KEY en tu entorno o archivo .env.local.'
      );
    }

    const endpoint = `https://api.rawg.io/api/games?key=${encodeURIComponent(
      apiKey.trim()
    )}&search=${encodeURIComponent(cleanQuery)}&page_size=10`;

    const response = await fetch(endpoint, {
      signal: options?.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Clave de API de RAWG inválida o caducada.');
      }
      if (response.status === 429) {
        throw new Error('Límite de peticiones de RAWG excedido. Espera unos momentos.');
      }
      throw new Error(`Error al consultar la API de RAWG (código HTTP ${response.status}).`);
    }

    const data = (await response.json()) as RawgResponse;
    return (data.results ?? []).map(normalizeRawgGame);
  },
};
