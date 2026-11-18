import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bggProvider, parseBggXml } from './bgg';

describe('parseBggXml', () => {
  it('returns empty array when xml string is empty or whitespace', () => {
    expect(parseBggXml('')).toEqual([]);
    expect(parseBggXml('   \n  ')).toEqual([]);
  });

  it('parses valid XML and extracts up to 10 board games with primary name and year', () => {
    const xml = `
      <items total="2" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
        <item type="boardgame" id="13">
          <name type="alternate" sortindex="1" value="Catan Das Spiel"/>
          <name type="primary" sortindex="1" value="Catan"/>
          <yearpublished value="1995"/>
        </item>
        <item type="boardgame" id="30549">
          <name type="primary" sortindex="1" value="Pandemic"/>
          <yearpublished value="2008"/>
        </item>
      </items>
    `;

    const results = parseBggXml(xml);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      externalId: '13',
      title: 'Catan',
      subtitle: 'Juego de mesa',
      releaseYear: 1995,
      coverUrl: undefined,
      meta: {
        bggId: '13',
        type: 'boardgame',
      },
    });

    expect(results[1]).toEqual({
      externalId: '30549',
      title: 'Pandemic',
      subtitle: 'Juego de mesa',
      releaseYear: 2008,
      coverUrl: undefined,
      meta: {
        bggId: '30549',
        type: 'boardgame',
      },
    });
  });

  it('falls back to first name element if no primary name is specified', () => {
    const xml = `
      <items total="1">
        <item type="boardgame" id="100">
          <name value="Alternative Name Only"/>
          <yearpublished value="2020"/>
        </item>
      </items>
    `;

    const results = parseBggXml(xml);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Alternative Name Only');
  });

  it('handles missing or non-positive yearpublished gracefully', () => {
    const xml = `
      <items total="2">
        <item type="boardgame" id="101">
          <name type="primary" value="Ancient Game"/>
        </item>
        <item type="boardgame" id="102">
          <name type="primary" value="Broken Year Game"/>
          <yearpublished value="invalid"/>
        </item>
      </items>
    `;

    const results = parseBggXml(xml);
    expect(results[0].releaseYear).toBeUndefined();
    expect(results[1].releaseYear).toBeUndefined();
  });

  it('limits results to a maximum of 10 items', () => {
    const items = Array.from({ length: 15 }, (_, i) => `
      <item type="boardgame" id="${i + 1}">
        <name type="primary" value="Game ${i + 1}"/>
        <yearpublished value="2000"/>
      </item>
    `).join('');

    const xml = `<items total="15">${items}</items>`;
    const results = parseBggXml(xml);

    expect(results).toHaveLength(10);
    expect(results[9].externalId).toBe('10');
  });

  it('throws an informative error when XML is malformed', () => {
    // In jsdom DOMParser produces a document with <parsererror> on invalid xml
    const malformedXml = '<items><item id="1"><name unclosed="tag"></item>';
    expect(() => parseBggXml(malformedXml)).toThrow('Error al interpretar el XML de BoardGameGeek.');
  });
});

describe('bggProvider.search', () => {
  const originalToken = import.meta.env.VITE_BGG_API_TOKEN;

  beforeEach(() => {
    vi.stubEnv('VITE_BGG_API_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (originalToken !== undefined) {
      vi.stubEnv('VITE_BGG_API_TOKEN', originalToken);
    }
  });

  it('returns empty array immediately if query is empty or whitespace', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const empty = await bggProvider.search('');
    const whitespace = await bggProvider.search('   ');

    expect(empty).toEqual([]);
    expect(whitespace).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('queries BGG endpoint and returns parsed results', async () => {
    const mockXml = `
      <items total="1">
        <item type="boardgame" id="42">
          <name type="primary" value="Carcassonne"/>
          <yearpublished value="2000"/>
        </item>
      </items>
    `;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => mockXml,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const results = await bggProvider.search('Carcassonne');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('/api/bgg/search?query=Carcassonne&type=boardgame');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Carcassonne');
    expect(results[0].releaseYear).toBe(2000);
  });

  it('includes Authorization Bearer header when VITE_BGG_API_TOKEN is set', async () => {
    vi.stubEnv('VITE_BGG_API_TOKEN', 'secret-bgg-token-999');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<items total="0"></items>',
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await bggProvider.search('Azul');

    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-bgg-token-999');
  });

  it('passes AbortSignal to fetch and re-throws AbortError on cancellation', async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      const abortError = new DOMException('The user aborted a request.', 'AbortError');
      return Promise.reject(abortError);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      bggProvider.search('Terraforming Mars', { signal: controller.signal })
    ).rejects.toThrow('The user aborted a request.');
  });

  it('throws friendly message suggesting Alta manual on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(bggProvider.search('Scythe')).rejects.toThrow(
      'No se pudo conectar con BoardGameGeek (posible restricción CORS, token o bloqueo). Puedes añadir el juego mediante Alta manual.'
    );
  });

  it('throws friendly message suggesting Alta manual on network/CORS error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(bggProvider.search('Wingspan')).rejects.toThrow(
      'No se pudo conectar con BoardGameGeek (posible restricción CORS, token o bloqueo). Puedes añadir el juego mediante Alta manual.'
    );
  });
});
