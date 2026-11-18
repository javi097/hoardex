import type {
  SearchProvider,
  SearchResult,
} from '@/interfaces/provider.interface';

const MOCK_DATASET: SearchResult[] = [
  // Videojuegos
  {
    externalId: 'mock-vg-1',
    title: 'The Legend of Zelda: Breath of the Wild',
    subtitle: 'Nintendo',
    releaseYear: 2017,
    coverUrl:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'videogames', platform: 'Nintendo Switch' },
  },
  {
    externalId: 'mock-vg-2',
    title: 'Super Mario Odyssey',
    subtitle: 'Nintendo',
    releaseYear: 2017,
    coverUrl:
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'videogames', platform: 'Nintendo Switch' },
  },
  {
    externalId: 'mock-vg-3',
    title: 'Elden Ring',
    subtitle: 'FromSoftware',
    releaseYear: 2022,
    coverUrl:
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'videogames', platform: 'Multiplataforma' },
  },
  {
    externalId: 'mock-vg-4',
    title: 'Retro Arcade Prototype Game',
    subtitle: 'Indie Studio',
    // Caso de prueba sin portada
    meta: { category: 'videogames', platform: 'Arcade' },
  },

  // Libros
  {
    externalId: 'mock-bk-1',
    title: 'Cien años de soledad',
    subtitle: 'Gabriel García Márquez',
    releaseYear: 1967,
    coverUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'books', publisher: 'Editorial Sudamericana' },
  },
  {
    externalId: 'mock-bk-2',
    title: 'Dune',
    subtitle: 'Frank Herbert',
    releaseYear: 1965,
    coverUrl:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'books', publisher: 'Chilton Books' },
  },
  {
    externalId: 'mock-bk-3',
    title: 'El Señor de los Anillos: La Comunidad del Anillo',
    subtitle: 'J.R.R. Tolkien',
    releaseYear: 1954,
    coverUrl:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'books', publisher: 'Allen & Unwin' },
  },
  {
    externalId: 'mock-bk-4',
    title: 'Manuscrito Antiguo Sin Edición',
    subtitle: 'Autor Anónimo',
    // Caso de prueba sin año y sin portada
    meta: { category: 'books', publisher: 'Independiente' },
  },

  // Juegos de mesa
  {
    externalId: 'mock-bg-1',
    title: 'Catan',
    subtitle: 'Klaus Teuber',
    releaseYear: 1995,
    coverUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'boardgames', players: '3-4' },
  },
  {
    externalId: 'mock-bg-2',
    title: 'Carcassonne',
    subtitle: 'Klaus-Jürgen Wrede',
    releaseYear: 2000,
    coverUrl:
      'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'boardgames', players: '2-5' },
  },
  {
    externalId: 'mock-bg-3',
    title: 'Terraforming Mars',
    subtitle: 'Jacob Fryxelius',
    releaseYear: 2016,
    coverUrl:
      'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'boardgames', players: '1-5' },
  },

  // Figuras
  {
    externalId: 'mock-fg-1',
    title: 'Figura Link - Tears of the Kingdom',
    subtitle: 'Good Smile Company',
    releaseYear: 2023,
    coverUrl:
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'figures', scale: '1/7' },
  },
  {
    externalId: 'mock-fg-2',
    title: 'Diorama Coleccionista Artesanal',
    subtitle: 'Custom Maker Studio',
    // Caso de prueba sin año
    coverUrl:
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'figures', scale: 'Personalizada' },
  },
  {
    externalId: 'mock-fg-3',
    title: 'Busto Escultura Desconocida',
    subtitle: 'Edición Limitada',
    // Caso de prueba sin año y sin portada
    meta: { category: 'figures', scale: '1/4' },
  },

  // Música / Discos
  {
    externalId: 'mock-mu-1',
    title: 'The Dark Side of the Moon',
    subtitle: 'Pink Floyd',
    releaseYear: 1973,
    coverUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'music', format: 'Vinilo' },
  },
  {
    externalId: 'mock-mu-2',
    title: 'Abbey Road',
    subtitle: 'The Beatles',
    releaseYear: 1969,
    coverUrl:
      'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'music', format: 'Vinilo' },
  },
  {
    externalId: 'mock-mu-3',
    title: 'Random Access Memories',
    subtitle: 'Daft Punk',
    releaseYear: 2013,
    coverUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    meta: { category: 'music', format: 'Digital / CD' },
  },
  {
    externalId: 'mock-mu-4',
    title: 'Bootleg Jam Session 90s',
    subtitle: 'Banda Local',
    // Caso de prueba sin portada
    releaseYear: 1994,
    meta: { category: 'music', format: 'Casete' },
  },
];

export const mockProvider: SearchProvider = {
  async search(query: string): Promise<SearchResult[]> {
    try {
      const cleanQuery = query.trim().toLowerCase();
      if (!cleanQuery) {
        return [];
      }

      // Latencia realista simulada (300ms a 600ms)
      const delayMs = 300 + Math.floor(Math.random() * 300);
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      if (cleanQuery === 'all') {
        return [...MOCK_DATASET];
      }

      const filtered = MOCK_DATASET.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(cleanQuery);
        const subtitleMatch = item.subtitle?.toLowerCase().includes(cleanQuery);
        const metaMatch = Object.values(item.meta).some((val) =>
          String(val).toLowerCase().includes(cleanQuery)
        );
        return titleMatch || subtitleMatch || metaMatch;
      });

      // Si no hay match específico, devolver los primeros 4 elementos para no frustrar búsquedas exploratorias
      if (filtered.length === 0) {
        return MOCK_DATASET.slice(0, 4);
      }

      return filtered;
    } catch {
      return [];
    }
  },
};
