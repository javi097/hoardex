import { describe, it, expect } from 'vitest';
import {
  escapeXml,
  generateWrappedShareText,
  generateWrappedSvg,
} from './wrappedCard';
import type { WrappedStats } from '@/interfaces/gamification.interface';

describe('wrappedCard', () => {
  const mockStats: WrappedStats = {
    year: 2026,
    hasActivity: true,
    totalAdded: 42,
    totalCompleted: 28,
    completionRate: 67,
    averageRating: 4.8,
    favoriteCollection: {
      collectionId: 'col-1',
      collectionName: 'Videojuegos & Cómics',
      accentColor: '#6366f1',
      icon: 'Gamepad2',
      itemsCount: 25,
      percentage: 60,
    },
    collectionsBreakdown: [
      {
        collectionId: 'col-1',
        collectionName: 'Videojuegos & Cómics',
        accentColor: '#6366f1',
        icon: 'Gamepad2',
        itemsCount: 25,
        percentage: 60,
      },
    ],
    topRatedItems: [
      {
        id: 'it-1',
        title: 'Elden Ring: Shadow <of the> Erdtree',
        collectionName: 'Videojuegos & Cómics',
        rating: 5,
      },
      {
        id: 'it-2',
        title: 'Metaphor: ReFantazio "Edición 2026"',
        collectionName: 'Videojuegos & Cómics',
        rating: 5,
      },
    ],
    longestStreak: 14,
    level: 5,
    levelTitle: 'Archivista & Curador',
    totalXp: 850,
  };

  describe('escapeXml', () => {
    it('escapa caracteres especiales XML (&, <, >, ", \') de forma estricta', () => {
      const input = `Dungeons & Dragons <5th Edition> "Special 'Collectors' Cut"`;
      const expected = `Dungeons &amp; Dragons &lt;5th Edition&gt; &quot;Special &apos;Collectors&apos; Cut&quot;`;
      expect(escapeXml(input)).toBe(expected);
    });

    it('devuelve la cadena intacta si no contiene caracteres reservados', () => {
      expect(escapeXml('Coleccion normal 2026')).toBe('Coleccion normal 2026');
    });
  });

  describe('generateWrappedShareText', () => {
    it('genera el resumen enriquecido con emojis y métricas principales', () => {
      const text = generateWrappedShareText(mockStats);

      expect(text).toContain('✨ Mi Hoardex Wrapped 2026 ✨');
      expect(text).toContain('📚 42 ítems añadidos a mi colección');
      expect(text).toContain('🏆 28 completados (67% completitud)');
      expect(text).toContain('👑 Colección estrella: Videojuegos & Cómics');
      expect(text).toContain('⭐ Valoración media: 4.8 / 5.0');
      expect(text).toContain('🌟 Mejor puntuados: Elden Ring: Shadow <of the> Erdtree, Metaphor: ReFantazio "Edición 2026"');
      expect(text).toContain('🔥 Racha récord: 14 días');
      expect(text).toContain('🎮 Nivel alcanzado: Nivel 5 (Archivista & Curador)');
      expect(text).toContain('https://hoardex.app');
    });

    it('gestiona de forma segura un estado con métricas a cero o vacías', () => {
      const emptyStats: WrappedStats = {
        year: 2026,
        hasActivity: false,
        totalAdded: 0,
        totalCompleted: 0,
        completionRate: 0,
        averageRating: null,
        favoriteCollection: null,
        collectionsBreakdown: [],
        topRatedItems: [],
        longestStreak: 0,
        level: 1,
        levelTitle: 'Iniciado',
        totalXp: 0,
      };

      const text = generateWrappedShareText(emptyStats);

      expect(text).toContain('📚 0 ítems añadidos');
      expect(text).toContain('🏆 0 completados (0% completitud)');
      expect(text).not.toContain('Colección estrella:');
      expect(text).not.toContain('Valoración media:');
      expect(text).not.toContain('Racha récord:');
      expect(text).toContain('🎮 Nivel alcanzado: Nivel 1 (Iniciado)');
    });
  });

  describe('generateWrappedSvg', () => {
    it('genera un documento SVG válido con viewBox 1080x1350 y textos debidamente escapados', () => {
      const svg = generateWrappedSvg(mockStats);

      // Comprobar apertura y cierre SVG
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('viewBox="0 0 1080 1350"');

      // Comprobar que los textos dinámicos con caracteres especiales se han escapado
      expect(svg).toContain('Videojuegos &amp; Cómics');
      expect(svg).not.toContain('Videojuegos & Cómics');
      expect(svg).toContain('&lt;of the&gt;');
      expect(svg).toContain('&quot;Edición 2026&quot;');

      // Comprobar que se incluyen los números de métricas
      expect(svg).toContain('42');
      expect(svg).toContain('28');
      expect(svg).toContain('67%');
      expect(svg).toContain('4.8 / 5.0');
      expect(svg).toContain('14 días consecutivos');
      expect(svg).toContain('Nivel 5 · Archivista &amp; Curador');
    });

    it('genera un SVG seguro cuando no hay actividad ni colección favorita', () => {
      const emptyStats: WrappedStats = {
        year: 2026,
        hasActivity: false,
        totalAdded: 0,
        totalCompleted: 0,
        completionRate: 0,
        averageRating: null,
        favoriteCollection: null,
        collectionsBreakdown: [],
        topRatedItems: [],
        longestStreak: 0,
        level: 1,
        levelTitle: 'Iniciado',
        totalXp: 0,
      };

      const svg = generateWrappedSvg(emptyStats);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Sin actividad');
      expect(svg).toContain('Sin ítems puntuados en este año');
      expect(svg).toContain('0 días consecutivos');
      expect(svg).toContain('Nivel 1 · Iniciado');
    });
  });
});
