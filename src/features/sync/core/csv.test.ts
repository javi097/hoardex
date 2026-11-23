import { describe, it, expect } from 'vitest';
import { exportToCsv, escapeCsvValue, CSV_HEADERS } from './csv';
import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';

describe('CSV Serializer (RFC 4180)', () => {
  describe('escapeCsvValue', () => {
    it('devuelve cadena vacía para null y undefined', () => {
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it('devuelve cadenas, números y booleanos simples sin comillas si no contienen caracteres especiales', () => {
      expect(escapeCsvValue('Elden Ring')).toBe('Elden Ring');
      expect(escapeCsvValue(2026)).toBe('2026');
      expect(escapeCsvValue(true)).toBe('true');
      expect(escapeCsvValue(false)).toBe('false');
    });

    it('envuelve en comillas dobles si contiene una coma', () => {
      expect(escapeCsvValue('Acción, Aventura')).toBe('"Acción, Aventura"');
    });

    it('duplica comillas internas y envuelve en comillas si contiene comillas dobles', () => {
      expect(escapeCsvValue('Edición "Coleccionista"')).toBe('"Edición ""Coleccionista"""');
    });

    it('envuelve en comillas dobles si contiene saltos de línea (\n o \r)', () => {
      expect(escapeCsvValue('Línea 1\nLínea 2')).toBe('"Línea 1\nLínea 2"');
      expect(escapeCsvValue('Línea 1\r\nLínea 2')).toBe('"Línea 1\r\nLínea 2"');
    });

    it('gestiona combinaciones de comas, comillas y saltos de línea simultáneos', () => {
      const input = 'Nota: "Muy bueno",\nRecomendado al 100%';
      const expected = '"Nota: ""Muy bueno"",\nRecomendado al 100%"';
      expect(escapeCsvValue(input)).toBe(expected);
    });
  });

  describe('exportToCsv', () => {
    const mockCollections: Collection[] = [
      {
        id: 'col-1',
        name: 'Videojuegos & Cómics',
        icon: 'Gamepad2',
        accentColor: '#6366f1',
        provider: 'rawg',
        createdAt: '2026-01-01T00:00:00Z',
        statuses: [
          { id: 'st-pending', label: 'Pendiente', isCompleted: false, order: 1 },
          { id: 'st-completed', label: 'Terminado', isCompleted: true, order: 2 },
        ],
      },
    ];

    it('comienza con el marcador Byte Order Mark UTF-8 (\\uFEFF) y la cabecera estandarizada', () => {
      const csv = exportToCsv(mockCollections, []);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const content = csv.slice(1);
      expect(content).toBe(CSV_HEADERS.join(','));
    });

    it('serializa ítems resolviendo nombres de colección y estados completados', () => {
      const items: Item[] = [
        {
          id: 'it-1',
          collectionId: 'col-1',
          title: 'The Legend of Zelda: Tears of the Kingdom',
          subtitle: 'Nintendo Switch',
          releaseYear: 2023,
          statusId: 'st-completed',
          rating: 5,
          notes: 'Obra maestra absoluta.',
          xpAwarded: true,
          meta: {},
          createdAt: '2026-01-10T12:00:00Z',
          updatedAt: '2026-02-15T18:30:00Z',
        },
      ];

      const csv = exportToCsv(mockCollections, items);
      const lines = csv.slice(1).split('\r\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(CSV_HEADERS.join(','));

      const expectedRow = [
        'col-1',
        'Videojuegos & Cómics',
        'it-1',
        'The Legend of Zelda: Tears of the Kingdom',
        'Nintendo Switch',
        '2023',
        'st-completed',
        'Terminado',
        'true', // is_completed
        '5',
        'Obra maestra absoluta.',
        '2026-01-10T12:00:00Z',
        '2026-02-15T18:30:00Z',
      ].join(',');

      expect(lines[1]).toBe(expectedRow);
    });

    it('escapa notas multilínea, comas en subtítulos y comillas internas preservando caracteres en español', () => {
      const items: Item[] = [
        {
          id: 'it-complex',
          collectionId: 'col-1',
          title: 'Guía "Definitiva" del Jugador',
          subtitle: 'Español, Edición Especial',
          releaseYear: 2026,
          statusId: 'st-pending',
          rating: 4,
          notes: 'Primera línea con acento: á, é, í, ó, ú, ñ.\nSegunda línea: "Recomendado, imprescindible".',
          xpAwarded: true,
          meta: {},
          createdAt: '2026-03-01T08:00:00Z',
          updatedAt: '2026-03-01T08:00:00Z',
        },
      ];

      const csv = exportToCsv(mockCollections, items);

      // Comprobar que incluye el título con comillas dobles duplicadas
      expect(csv).toContain('"Guía ""Definitiva"" del Jugador"');
      // Subtítulo con comas envuelto en comillas
      expect(csv).toContain('"Español, Edición Especial"');
      // Notas multilínea con saltos y comillas escapadas
      expect(csv).toContain(
        '"Primera línea con acento: á, é, í, ó, ú, ñ.\nSegunda línea: ""Recomendado, imprescindible""."'
      );
      // Estado no completado
      expect(csv).toContain('Pendiente,false');
    });

    it('gestiona defensivamente ítems cuya colección o estado no se encuentra', () => {
      const items: Item[] = [
        {
          id: 'it-orphan',
          collectionId: 'col-unknown',
          title: 'Ítem Huérfano',
          statusId: 'st-unknown',
          xpAwarded: false,
          meta: {},
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const csv = exportToCsv(mockCollections, items);
      const lines = csv.slice(1).split('\r\n');

      expect(lines).toHaveLength(2);
      // colName vacío, statusLabel es statusId fallback, is_completed es 'false'
      expect(lines[1]).toContain('col-unknown,,it-orphan,Ítem Huérfano,,,st-unknown,st-unknown,false');
    });
  });
});
