import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeRawgGame, type RawgGame, rawgProvider } from './rawg';

describe('normalizeRawgGame', () => {
  it('normalizes a complete game with all fields', () => {
    const mockGame: RawgGame = {
      id: 3328,
      name: 'The Witcher 3: Wild Hunt',
      released: '2015-05-18',
      background_image: 'https://media.rawg.io/media/games/witcher3.jpg',
      platforms: [
        { platform: { id: 4, name: 'PC', slug: 'pc' } },
        { platform: { id: 18, name: 'PlayStation 4', slug: 'ps4' } },
        { platform: { id: 1, name: 'Xbox One', slug: 'xbox-one' } },
        { platform: { id: 7, name: 'Nintendo Switch', slug: 'nintendo-switch' } },
      ],
      genres: [
        { id: 4, name: 'Action' },
        { id: 5, name: 'RPG' },
      ],
      rating: 4.66,
    };

    const result = normalizeRawgGame(mockGame);

    expect(result.externalId).toBe('3328');
    expect(result.title).toBe('The Witcher 3: Wild Hunt');
    expect(result.subtitle).toBe('PC, PlayStation 4, Xbox One');
    expect(result.releaseYear).toBe(2015);
    expect(result.coverUrl).toBe('https://media.rawg.io/media/games/witcher3.jpg');
    expect(result.meta).toEqual({
      rawgId: 3328,
      platforms: 'PC, PlayStation 4, Xbox One, Nintendo Switch',
      genres: 'Action, RPG',
      rating: 4.66,
    });
  });

  it('normalizes game with missing optional fields to undefined', () => {
    const incompleteGame: RawgGame = {
      id: 9999,
      name: 'Indie Prototype',
      released: null,
      background_image: null,
      platforms: null,
      genres: null,
    };

    const result = normalizeRawgGame(incompleteGame);

    expect(result.externalId).toBe('9999');
    expect(result.title).toBe('Indie Prototype');
    expect(result.subtitle).toBeUndefined();
    expect(result.releaseYear).toBeUndefined();
    expect(result.coverUrl).toBeUndefined();
    expect(result.meta).toEqual({
      rawgId: 9999,
    });
  });

  it('handles invalid release dates gracefully', () => {
    const invalidDateGame: RawgGame = {
      id: 555,
      name: 'Upcoming Title',
      released: 'TBD',
      background_image: 'https://media.rawg.io/media/games/upcoming.jpg',
    };

    const result = normalizeRawgGame(invalidDateGame);
    expect(result.releaseYear).toBeUndefined();
  });
});

describe('rawgProvider.search', () => {
  const originalEnv = import.meta.env.VITE_RAWG_API_KEY;

  beforeEach(() => {
    vi.stubEnv('VITE_RAWG_API_KEY', 'test-api-key-12345');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (originalEnv !== undefined) {
      vi.stubEnv('VITE_RAWG_API_KEY', originalEnv);
    }
  });

  it('returns empty array immediately if query is empty or whitespace', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const emptyResult = await rawgProvider.search('');
    const whitespaceResult = await rawgProvider.search('   ');

    expect(emptyResult).toEqual([]);
    expect(whitespaceResult).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws an informative error if VITE_RAWG_API_KEY is missing or empty', async () => {
    vi.stubEnv('VITE_RAWG_API_KEY', '');

    await expect(rawgProvider.search('Zelda')).rejects.toThrow(
      'Clave de API de RAWG no configurada. Configura VITE_RAWG_API_KEY en tu entorno o archivo .env.local.'
    );
  });

  it('queries RAWG endpoint with encoded parameters and returns normalized results', async () => {
    const mockGames: RawgGame[] = [
      {
        id: 1,
        name: 'Super Mario Bros.',
        released: '1985-09-13',
        background_image: 'https://media.rawg.io/mario.jpg',
        platforms: [{ platform: { id: 1, name: 'NES', slug: 'nes' } }],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: 1, results: mockGames }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const results = await rawgProvider.search('Super Mario & Luigi');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://api.rawg.io/api/games?');
    expect(calledUrl).toContain('key=test-api-key-12345');
    expect(calledUrl).toContain(`search=${encodeURIComponent('Super Mario & Luigi')}`);
    expect(calledUrl).toContain('page_size=10');

    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe('1');
    expect(results[0].title).toBe('Super Mario Bros.');
    expect(results[0].releaseYear).toBe(1985);
  });

  it('passes AbortSignal to fetch for cancellation', async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ count: 0, results: [] }),
      } as unknown as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    await rawgProvider.search('Metroid', { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('throws friendly error message on HTTP 401 unauthorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(rawgProvider.search('Portal')).rejects.toThrow(
      'Clave de API de RAWG inválida o caducada.'
    );
  });

  it('throws friendly error message on HTTP 429 rate limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(rawgProvider.search('Half-Life')).rejects.toThrow(
      'Límite de peticiones de RAWG excedido. Espera unos momentos.'
    );
  });

  it('throws informative error message on other HTTP error codes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(rawgProvider.search('Doom')).rejects.toThrow(
      'Error al consultar la API de RAWG (código HTTP 503).'
    );
  });
});
